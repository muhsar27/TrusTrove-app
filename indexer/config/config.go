package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	StellarNetwork          string
	HorizonURL              string
	SorobanRPCURL           string
	NetworkPassphrase       string
	RegistryContractID      string
	InvoiceContractID       string
	PoolContractID          string
	EscrowContractID        string
	USDCIssuer              string
	USDCAssetCode           string
	DatabaseURL             string
	APIPort                 string
	IndexerPollIntervalMs   int
	JWTSecret               string
	JWTExpiryHours          int
}

func LoadConfig() (*Config, error) {
	// Try loading from parent directories or current directory
	_ = godotenv.Load("../.env.local")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env.local")
	_ = godotenv.Load(".env")

	pollIntervalMsStr := os.Getenv("INDEXER_POLL_INTERVAL_MS")
	pollIntervalMs := 5000
	if pollIntervalMsStr != "" {
		if val, err := strconv.Atoi(pollIntervalMsStr); err == nil {
			pollIntervalMs = val
		}
	}

	jwtExpiryHoursStr := os.Getenv("JWT_EXPIRY_HOURS")
	jwtExpiryHours := 24
	if jwtExpiryHoursStr != "" {
		if val, err := strconv.Atoi(jwtExpiryHoursStr); err == nil {
			jwtExpiryHours = val
		}
	}

	apiPort := os.Getenv("API_PORT")
	if apiPort == "" {
		apiPort = os.Getenv("PORT") // Render provides PORT automatically
	}
	if apiPort == "" {
		apiPort = "8080"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "change_me_before_production"
	}

	return &Config{
		StellarNetwork:          os.Getenv("NEXT_PUBLIC_STELLAR_NETWORK"),
		HorizonURL:              os.Getenv("NEXT_PUBLIC_HORIZON_URL"),
		SorobanRPCURL:           os.Getenv("NEXT_PUBLIC_SOROBAN_RPC_URL"),
		NetworkPassphrase:       os.Getenv("NEXT_PUBLIC_NETWORK_PASSPHRASE"),
		RegistryContractID:      os.Getenv("NEXT_PUBLIC_REGISTRY_CONTRACT_ID"),
		InvoiceContractID:       os.Getenv("NEXT_PUBLIC_INVOICE_CONTRACT_ID"),
		PoolContractID:          os.Getenv("NEXT_PUBLIC_POOL_CONTRACT_ID"),
		EscrowContractID:        os.Getenv("NEXT_PUBLIC_ESCROW_CONTRACT_ID"),
		USDCIssuer:              os.Getenv("NEXT_PUBLIC_USDC_ISSUER"),
		USDCAssetCode:           os.Getenv("NEXT_PUBLIC_USDC_ASSET_CODE"),
		DatabaseURL:             os.Getenv("DATABASE_URL"),
		APIPort:                 apiPort,
		IndexerPollIntervalMs:   pollIntervalMs,
		JWTSecret:               jwtSecret,
		JWTExpiryHours:          jwtExpiryHours,
	}, nil
}
