package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type DbInvoice struct {
	ID                 string  `json:"id"`
	Issuer             string  `json:"issuer"`
	Buyer              string  `json:"buyer"`
	FaceValue          string  `json:"face_value"` // BigInt represented as string for JSON/SQL numeric safety
	DiscountBps        int     `json:"discount_bps"`
	FundedAmount       string  `json:"funded_amount"`
	DueDate            int64   `json:"due_date"`
	Status             string  `json:"status"`
	CreatedAt          int64   `json:"created_at"`
	FundedAt           *int64  `json:"funded_at"`
	ShippedAt          *int64  `json:"shipped_at"`
	IssuerConfirmed    bool    `json:"issuer_confirmed"`
	BuyerConfirmed     bool    `json:"buyer_confirmed"`
	BuyerConfirmedAt   *int64  `json:"buyer_confirmed_at"`
	RepaidAt           *int64  `json:"repaid_at"`
	AttestationAgentID *string `json:"attestation_agent_id"`
	RiskScoreBps       *int    `json:"risk_score_bps"`
	EvidenceHash       *string `json:"evidence_hash"`
	AttestedAt         *int64  `json:"attested_at"`
}

type DbPoolStats struct {
	TotalDeposits         string    `json:"total_deposits"`
	TotalFunded           string    `json:"total_funded"`
	AvailableLiquidity    string    `json:"available_liquidity"`
	UtilizationRateBps    int       `json:"utilization_rate_bps"`
	TotalYieldDistributed string    `json:"total_yield_distributed"`
	ActiveInvoiceCount    int       `json:"active_invoice_count"`
	TotalShares           string    `json:"total_shares"`
	UpdatedAt             time.Time `json:"updated_at"`
}

type ProtocolStats struct {
	TotalUSDCFinanced  string `json:"total_usdc_financed"`
	ActiveInvoiceCount int    `json:"active_invoice_count"`
	TotalInvoices      int    `json:"total_invoices"`
	TotalRepaid        int    `json:"total_repaid"`
	TotalDefaulted     int    `json:"total_defaulted"`
	AverageYieldBps    int    `json:"average_yield_bps"`
	PoolUtilizationBps int    `json:"pool_utilization_bps"`
	RegisteredIssuers  int    `json:"registered_issuers"`
}

// GetProtocolStats returns the protocol-level aggregates served by GET /stats.
//
// Status literals must match the CapCase values the listener writes
// (Created, Listed, Funded, Active, Confirmed, Repaid, Defaulted); Postgres
// string comparison is case-sensitive. An invoice counts as "active" while
// capital is deployed and not yet returned: Funded, Active (shipped) and
// Confirmed (delivery confirmed, awaiting repayment). The financed total and
// average yield additionally include Repaid invoices.
func GetProtocolStats(ctx context.Context) (*ProtocolStats, error) {
	return getProtocolStats(ctx, Pool)
}

func getProtocolStats(ctx context.Context, q Querier) (*ProtocolStats, error) {
	query := `
		SELECT
			COALESCE(SUM(funded_amount) FILTER (WHERE status IN ('Funded', 'Active', 'Confirmed', 'Repaid')), 0)::TEXT AS total_usdc_financed,
			COUNT(*) FILTER (WHERE status IN ('Funded', 'Active', 'Confirmed')) AS active_invoice_count,
			COUNT(*) AS total_invoices,
			COUNT(*) FILTER (WHERE status = 'Repaid') AS total_repaid,
			COUNT(*) FILTER (WHERE status = 'Defaulted') AS total_defaulted,
			COALESCE(AVG(discount_bps) FILTER (WHERE status IN ('Funded', 'Active', 'Confirmed', 'Repaid')), 0)::INTEGER AS average_yield_bps,
			COALESCE((SELECT utilization_rate_bps FROM pool_snapshots WHERE id = 1), 0) AS pool_utilization_bps,
			COUNT(DISTINCT issuer) AS registered_issuers
		FROM invoices
	`
	var stats ProtocolStats
	err := q.QueryRow(ctx, query).Scan(
		&stats.TotalUSDCFinanced,
		&stats.ActiveInvoiceCount,
		&stats.TotalInvoices,
		&stats.TotalRepaid,
		&stats.TotalDefaulted,
		&stats.AverageYieldBps,
		&stats.PoolUtilizationBps,
		&stats.RegisteredIssuers,
	)
	if err != nil {
		return nil, fmt.Errorf("queries: get protocol stats: %w", err)
	}
	return &stats, nil
}

// The Insert*/Update* invoice writers and LogEvent below take a Querier so
// callers can run them against the shared pool (db.Pool) for standalone
// statements, or against a pgx.Tx when several statements must commit or
// roll back together (see db.WithTx and the listener's event handling).

func InsertInvoice(ctx context.Context, q Querier, inv *DbInvoice) error {
	query := `
		INSERT INTO invoices (
			id, issuer, buyer, face_value, discount_bps, funded_amount, due_date, status, created_at,
			funded_at, shipped_at, issuer_confirmed, buyer_confirmed, buyer_confirmed_at, repaid_at,
			attestation_agent_id, risk_score_bps, evidence_hash, attested_at
		) VALUES (
			@id, @issuer, @buyer, @face_value, @discount_bps, @funded_amount, @due_date, @status, @created_at,
			@funded_at, @shipped_at, @issuer_confirmed, @buyer_confirmed, @buyer_confirmed_at, @repaid_at,
			@attestation_agent_id, @risk_score_bps, @evidence_hash, @attested_at
		)
	`
	args := pgx.NamedArgs{
		"id":                   inv.ID,
		"issuer":               inv.Issuer,
		"buyer":                inv.Buyer,
		"face_value":           inv.FaceValue,
		"discount_bps":         inv.DiscountBps,
		"funded_amount":        inv.FundedAmount,
		"due_date":             inv.DueDate,
		"status":               inv.Status,
		"created_at":           inv.CreatedAt,
		"funded_at":            inv.FundedAt,
		"shipped_at":           inv.ShippedAt,
		"issuer_confirmed":     inv.IssuerConfirmed,
		"buyer_confirmed":      inv.BuyerConfirmed,
		"buyer_confirmed_at":   inv.BuyerConfirmedAt,
		"repaid_at":            inv.RepaidAt,
		"attestation_agent_id": inv.AttestationAgentID,
		"risk_score_bps":       inv.RiskScoreBps,
		"evidence_hash":        inv.EvidenceHash,
		"attested_at":          inv.AttestedAt,
	}
	_, err := q.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("queries: insert invoice: %w", err)
	}
	return nil
}

func GetInvoiceByID(ctx context.Context, q Querier, id string) (*DbInvoice, error) {
	query := `
		SELECT id, issuer, buyer, face_value, discount_bps, funded_amount, due_date, status, created_at,
			funded_at, shipped_at, issuer_confirmed, buyer_confirmed, buyer_confirmed_at, repaid_at,
			attestation_agent_id, risk_score_bps, evidence_hash, attested_at
		FROM invoices WHERE id = $1
	`
	var inv DbInvoice
	err := q.QueryRow(ctx, query, id).Scan(
		&inv.ID, &inv.Issuer, &inv.Buyer, &inv.FaceValue, &inv.DiscountBps, &inv.FundedAmount,
		&inv.DueDate, &inv.Status, &inv.CreatedAt, &inv.FundedAt, &inv.ShippedAt,
		&inv.IssuerConfirmed, &inv.BuyerConfirmed, &inv.BuyerConfirmedAt, &inv.RepaidAt,
		&inv.AttestationAgentID, &inv.RiskScoreBps, &inv.EvidenceHash, &inv.AttestedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("queries: get invoice by id: %w", err)
	}
	return &inv, nil
}

func GetInvoicesPage(ctx context.Context, status, issuer string, limit, offset int) ([]*DbInvoice, int, error) {
	predicates := make([]string, 0, 2)
	filterArgs := make([]any, 0, 2)

	if status != "" {
		predicates = append(predicates, fmt.Sprintf("status = $%d", len(filterArgs)+1))
		filterArgs = append(filterArgs, status)
	}
	if issuer != "" {
		predicates = append(predicates, fmt.Sprintf("issuer = $%d", len(filterArgs)+1))
		filterArgs = append(filterArgs, issuer)
	}

	whereClause := ""
	if len(predicates) > 0 {
		whereClause = " WHERE " + strings.Join(predicates, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM invoices" + whereClause
	var total int
	if err := Pool.QueryRow(ctx, countQuery, filterArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("queries: count invoices: %w", err)
	}

	limitPlaceholder := len(filterArgs) + 1
	offsetPlaceholder := len(filterArgs) + 2
	query := fmt.Sprintf(`
		SELECT 
			id, issuer, buyer, face_value, discount_bps, funded_amount, due_date, status, created_at,
			funded_at, shipped_at, issuer_confirmed, buyer_confirmed, buyer_confirmed_at, repaid_at,
			attestation_agent_id, risk_score_bps, evidence_hash, attested_at
		FROM invoices%s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, limitPlaceholder, offsetPlaceholder)
	queryArgs := append(append([]any{}, filterArgs...), limit, offset)

	rows, err := Pool.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("queries: get invoices: %w", err)
	}
	defer rows.Close()

	invoices := make([]*DbInvoice, 0)
	for rows.Next() {
		var inv DbInvoice
		if err := rows.Scan(
			&inv.ID, &inv.Issuer, &inv.Buyer, &inv.FaceValue, &inv.DiscountBps, &inv.FundedAmount,
			&inv.DueDate, &inv.Status, &inv.CreatedAt, &inv.FundedAt, &inv.ShippedAt,
			&inv.IssuerConfirmed, &inv.BuyerConfirmed, &inv.BuyerConfirmedAt, &inv.RepaidAt,
			&inv.AttestationAgentID, &inv.RiskScoreBps, &inv.EvidenceHash, &inv.AttestedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("queries: scan invoice: %w", err)
		}
		invoices = append(invoices, &inv)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("queries: iterate invoices: %w", err)
	}
	return invoices, total, nil
}

// invoiceStatusRank is the allowed invoice status machine (issue #927):
//
//	Created -> Listed -> Funded -> Active -> Confirmed -> Repaid
//	                                              \-> Defaulted
//
// Repaid and Defaulted are mutually exclusive terminal states (same rank).
// Every status-changing Update* writer below guards its statement with
// `status = ANY(<statuses ranked below the target>)`, so a replayed or
// out-of-order event can never move an invoice backwards: an event whose
// target status does not rank above the current one matches zero rows and is
// reported as ErrStaleStatusTransition.
var invoiceStatusRank = map[string]int{
	"Created":   0,
	"Listed":    1,
	"Funded":    2,
	"Active":    3,
	"Confirmed": 4,
	"Repaid":    5,
	"Defaulted": 5,
}

// ErrInvoiceNotFound reports that an invoice UPDATE matched no row because
// the invoice itself is not in the invoices table yet (the indexer started
// mid-history, InvoiceCreated was never applied, or events arrived out of
// order across the contracts). The state change was lost, so the listener
// must not record such an event as processed — it has to be retried once the
// row exists (issue #927).
var ErrInvoiceNotFound = errors.New("invoice not found")

// ErrStaleStatusTransition reports that an invoice UPDATE matched no row
// because the invoice's current status is not an allowed predecessor of the
// event's target status — a replayed or out-of-order event that would move
// the invoice backwards. The row exists and already reflects newer state, so
// the listener records the event as processed without applying it
// (issue #927).
var ErrStaleStatusTransition = errors.New("stale invoice status transition")

// allowedPriorStatuses returns every lifecycle status that may precede target
// in the documented invoice lifecycle above. An unknown target is an error:
// callers only ever name real statuses (and the migration 012 CHECK
// constraint rejects anything else), so a bad name is a bug worth surfacing
// rather than silently allowing or blocking every transition.
func allowedPriorStatuses(target string) ([]string, error) {
	targetRank, ok := invoiceStatusRank[target]
	if !ok {
		return nil, fmt.Errorf("unknown invoice status %q", target)
	}
	allowed := make([]string, 0, len(invoiceStatusRank))
	for status, rank := range invoiceStatusRank {
		if rank < targetRank {
			allowed = append(allowed, status)
		}
	}
	return allowed, nil
}

// execInvoiceUpdate runs one of the guarded invoice UPDATE statements and
// translates an empty command tag into a sentinel error (issue #927). A
// successful statement with no error but zero rows affected means the WHERE
// clause matched nothing: either the invoice row is missing
// (ErrInvoiceNotFound) or the status guard rejected a stale event
// (ErrStaleStatusTransition). A follow-up existence probe — run only on this
// failure path — tells the two apart so callers can retry the former and
// record the latter as handled.
func execInvoiceUpdate(ctx context.Context, q Querier, op, query, invoiceID string, args ...any) error {
	tag, err := q.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("queries: %s: %w", op, err)
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	var exists bool
	if err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM invoices WHERE id = $1)`, invoiceID).Scan(&exists); err != nil {
		return fmt.Errorf("queries: %s: probe invoice %s: %w", op, invoiceID, err)
	}
	if !exists {
		return fmt.Errorf("queries: %s invoice %s: %w", op, invoiceID, ErrInvoiceNotFound)
	}
	return fmt.Errorf("queries: %s invoice %s: %w", op, invoiceID, ErrStaleStatusTransition)
}

func UpdateInvoiceListed(ctx context.Context, q Querier, id string, status string, discountBps int) error {
	allowed, err := allowedPriorStatuses(status)
	if err != nil {
		return fmt.Errorf("queries: update invoice listed: %w", err)
	}
	query := `
		UPDATE invoices 
		SET status = $1, discount_bps = $2
		WHERE id = $3 AND status = ANY($4)
	`
	return execInvoiceUpdate(ctx, q, "update invoice listed", query, id, status, discountBps, id, allowed)
}

func UpdateInvoiceFunded(ctx context.Context, q Querier, id string, status string, fundedAmount string, fundedAt int64) error {
	allowed, err := allowedPriorStatuses(status)
	if err != nil {
		return fmt.Errorf("queries: update invoice funded: %w", err)
	}
	query := `
		UPDATE invoices 
		SET status = $1, funded_amount = $2, funded_at = $3
		WHERE id = $4 AND status = ANY($5)
	`
	return execInvoiceUpdate(ctx, q, "update invoice funded", query, id, status, fundedAmount, fundedAt, id, allowed)
}

func UpdateInvoiceShipped(ctx context.Context, q Querier, id string, status string, shippedAt int64) error {
	allowed, err := allowedPriorStatuses(status)
	if err != nil {
		return fmt.Errorf("queries: update invoice shipped: %w", err)
	}
	query := `
		UPDATE invoices 
		SET status = $1, shipped_at = $2, issuer_confirmed = TRUE
		WHERE id = $3 AND status = ANY($4)
	`
	return execInvoiceUpdate(ctx, q, "update invoice shipped", query, id, status, shippedAt, id, allowed)
}

func UpdateInvoiceDeliveryConfirmed(ctx context.Context, q Querier, id string, status string, buyerConfirmedAt int64) error {
	allowed, err := allowedPriorStatuses(status)
	if err != nil {
		return fmt.Errorf("queries: update invoice delivery confirmed: %w", err)
	}
	query := `
		UPDATE invoices 
		SET status = $1, buyer_confirmed = TRUE, buyer_confirmed_at = $2
		WHERE id = $3 AND status = ANY($4)
	`
	return execInvoiceUpdate(ctx, q, "update invoice delivery confirmed", query, id, status, buyerConfirmedAt, id, allowed)
}

func UpdateInvoiceRepaid(ctx context.Context, q Querier, id string, status string, repaidAt int64) error {
	allowed, err := allowedPriorStatuses(status)
	if err != nil {
		return fmt.Errorf("queries: update invoice repaid: %w", err)
	}
	query := `
		UPDATE invoices 
		SET status = $1, repaid_at = $2
		WHERE id = $3 AND status = ANY($4)
	`
	return execInvoiceUpdate(ctx, q, "update invoice repaid", query, id, status, repaidAt, id, allowed)
}

func UpdateInvoiceStatus(ctx context.Context, q Querier, id string, status string) error {
	allowed, err := allowedPriorStatuses(status)
	if err != nil {
		return fmt.Errorf("queries: update invoice status: %w", err)
	}
	query := `
		UPDATE invoices 
		SET status = $1
		WHERE id = $2 AND status = ANY($3)
	`
	return execInvoiceUpdate(ctx, q, "update invoice status", query, id, status, id, allowed)
}

// UpdateInvoiceAttestation records an underwriting attestation. It changes no
// status, so it carries no lifecycle guard — but it still checks the command
// tag (issue #927): an attestation for an invoice that has not been indexed
// yet must surface ErrInvoiceNotFound instead of silently affecting 0 rows.
func UpdateInvoiceAttestation(ctx context.Context, q Querier, invoiceID, agentID, evidenceHash string, riskScoreBps int, attestedAt int64) error {
	query := `
		UPDATE invoices 
		SET attestation_agent_id = $1, risk_score_bps = $2, evidence_hash = $3, attested_at = $4
		WHERE id = $5
	`
	return execInvoiceUpdate(ctx, q, "update invoice attestation", query, invoiceID, agentID, riskScoreBps, evidenceHash, attestedAt, invoiceID)
}

func GetPoolStats(ctx context.Context) (*DbPoolStats, error) {
	query := `
		SELECT total_deposits, total_funded, available_liquidity, utilization_rate_bps, total_yield_distributed, active_invoice_count, total_shares, updated_at
		FROM pool_snapshots
		WHERE id = 1
	`
	row := Pool.QueryRow(ctx, query)
	var stats DbPoolStats
	err := row.Scan(
		&stats.TotalDeposits, &stats.TotalFunded, &stats.AvailableLiquidity,
		&stats.UtilizationRateBps, &stats.TotalYieldDistributed, &stats.ActiveInvoiceCount,
		&stats.TotalShares, &stats.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("queries: get pool stats: %w", err)
	}
	return &stats, nil
}

func UpdatePoolStats(ctx context.Context, stats *DbPoolStats) error {
	query := `
		UPDATE pool_snapshots
		SET total_deposits = @total_deposits,
		    total_funded = @total_funded,
		    available_liquidity = @available_liquidity,
		    utilization_rate_bps = @utilization_rate_bps,
		    total_yield_distributed = @total_yield_distributed,
		    active_invoice_count = @active_invoice_count,
		    total_shares = @total_shares,
		updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`
	args := pgx.NamedArgs{
		"total_deposits":          stats.TotalDeposits,
		"total_funded":            stats.TotalFunded,
		"available_liquidity":     stats.AvailableLiquidity,
		"utilization_rate_bps":    stats.UtilizationRateBps,
		"total_yield_distributed": stats.TotalYieldDistributed,
		"active_invoice_count":    stats.ActiveInvoiceCount,
		"total_shares":            stats.TotalShares,
	}
	_, err := Pool.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("queries: update pool stats: %w", err)
	}
	return insertPoolSnapshotHistory(ctx, stats)
}

type DbPoolSnapshotHistory struct {
	RecordedAt            int64  `json:"recorded_at"`
	TotalDeposits         string `json:"total_deposits"`
	TotalFunded           string `json:"total_funded"`
	AvailableLiquidity    string `json:"available_liquidity"`
	UtilizationRateBps    int    `json:"utilization_rate_bps"`
	TotalYieldDistributed string `json:"total_yield_distributed"`
	ActiveInvoiceCount    int    `json:"active_invoice_count"`
	TotalShares           string `json:"total_shares"`
}

func insertPoolSnapshotHistory(ctx context.Context, stats *DbPoolStats) error {
	query := `
		INSERT INTO pool_snapshot_history
		    (recorded_at, total_deposits, total_funded, available_liquidity,
		     utilization_rate_bps, total_yield_distributed, active_invoice_count, total_shares)
		VALUES (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT, @total_deposits, @total_funded,
		        @available_liquidity, @utilization_rate_bps, @total_yield_distributed,
		        @active_invoice_count, @total_shares)
	`
	args := pgx.NamedArgs{
		"total_deposits":          stats.TotalDeposits,
		"total_funded":            stats.TotalFunded,
		"available_liquidity":     stats.AvailableLiquidity,
		"utilization_rate_bps":    stats.UtilizationRateBps,
		"total_yield_distributed": stats.TotalYieldDistributed,
		"active_invoice_count":    stats.ActiveInvoiceCount,
		"total_shares":            stats.TotalShares,
	}
	if _, err := Pool.Exec(ctx, query, args); err != nil {
		return fmt.Errorf("queries: insert pool snapshot history: %w", err)
	}
	return nil
}

func GetPoolSnapshotHistory(ctx context.Context, limit int) ([]*DbPoolSnapshotHistory, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	query := `
		SELECT recorded_at, total_deposits, total_funded, available_liquidity,
		       utilization_rate_bps, total_yield_distributed, active_invoice_count, total_shares
		FROM pool_snapshot_history
		ORDER BY recorded_at DESC
		LIMIT $1
	`
	rows, err := Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("queries: get pool snapshot history: %w", err)
	}
	defer rows.Close()

	history := []*DbPoolSnapshotHistory{}
	for rows.Next() {
		var h DbPoolSnapshotHistory
		if err := rows.Scan(&h.RecordedAt, &h.TotalDeposits, &h.TotalFunded,
			&h.AvailableLiquidity, &h.UtilizationRateBps, &h.TotalYieldDistributed,
			&h.ActiveInvoiceCount, &h.TotalShares); err != nil {
			return nil, fmt.Errorf("queries: scan pool snapshot history: %w", err)
		}
		history = append(history, &h)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("queries: iterate pool snapshot history: %w", err)
	}
	return history, nil
}

func LogEvent(ctx context.Context, q Querier, eventID, contractID string, ledger int32, ledgerClosedAt int64, eventType string, data interface{}) error {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("queries: log event: marshal data: %w", err)
	}

	query := `
		INSERT INTO events_log (event_id, contract_id, ledger, ledger_closed_at, event_type, data)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (event_id) DO NOTHING
	`
	_, err = q.Exec(ctx, query, eventID, contractID, ledger, ledgerClosedAt, eventType, dataBytes)
	if err != nil {
		return fmt.Errorf("queries: log event: %w", err)
	}
	return nil
}

// AreEventsProcessed returns the event IDs from ids that have already been
// recorded. It deliberately performs one query for the whole polling batch.
func AreEventsProcessed(ctx context.Context, ids []string) (map[string]bool, error) {
	processed := make(map[string]bool, len(ids))
	if len(ids) == 0 {
		return processed, nil
	}

	rows, err := Pool.Query(ctx, `SELECT event_id FROM events_log WHERE event_id = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("queries: check processed events: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("queries: scan processed event: %w", err)
		}
		processed[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("queries: iterate processed events: %w", err)
	}
	return processed, nil
}

func IsEventProcessed(ctx context.Context, id string) (bool, error) {
	processed, err := AreEventsProcessed(ctx, []string{id})
	if err != nil {
		return false, err
	}
	return processed[id], nil
}

type EventLog struct {
	ID             int             `json:"id"`
	EventID        string          `json:"event_id"`
	ContractID     string          `json:"contract_id"`
	Ledger         int32           `json:"ledger"`
	LedgerClosedAt int64           `json:"ledger_closed_at"`
	EventType      string          `json:"event_type"`
	Data           json.RawMessage `json:"data"`
}

func GetRecentEvents(ctx context.Context, limit int) ([]*EventLog, error) {
	query := `
		SELECT id, event_id, contract_id, ledger, ledger_closed_at, event_type, data
		FROM events_log
		ORDER BY ledger_closed_at DESC, id DESC
		LIMIT $1
	`
	rows, err := Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("queries: get recent events: %w", err)
	}
	defer rows.Close()

	var events []*EventLog
	for rows.Next() {
		var ev EventLog
		err := rows.Scan(&ev.ID, &ev.EventID, &ev.ContractID, &ev.Ledger, &ev.LedgerClosedAt, &ev.EventType, &ev.Data)
		if err != nil {
			return nil, fmt.Errorf("queries: scan event: %w", err)
		}
		events = append(events, &ev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("queries: iterate events: %w", err)
	}
	return events, nil
}

func GetLatestProcessedLedger(ctx context.Context) (int32, error) {
	query := `SELECT COALESCE(MAX(ledger), 0) FROM events_log`
	var ledger int32
	err := Pool.QueryRow(ctx, query).Scan(&ledger)
	if err != nil {
		return 0, fmt.Errorf("queries: get latest processed ledger: %w", err)
	}
	return ledger, nil
}

func GetCheckpoint(ctx context.Context) (int32, error) {
	query := `SELECT value FROM indexer_checkpoint WHERE key = 'latest_processed_ledger'`
	var ledger int32
	err := Pool.QueryRow(ctx, query).Scan(&ledger)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("queries: get checkpoint: %w", err)
	}
	return ledger, nil
}

func UpsertCheckpoint(ctx context.Context, ledger int32) error {
	query := `INSERT INTO indexer_checkpoint (key, value) VALUES ('latest_processed_ledger', $1)
	          ON CONFLICT (key) DO UPDATE SET value = $1`
	_, err := Pool.Exec(ctx, query, ledger)
	if err != nil {
		return fmt.Errorf("queries: upsert checkpoint: %w", err)
	}
	return nil
}
