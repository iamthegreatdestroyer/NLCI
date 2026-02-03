#!/usr/bin/env bash
# NLCI Development Environment Setup Script
set -euo pipefail

echo "🚀 NLCI Development Setup"
echo "=========================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Node.js version
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "  Install from: https://nodejs.org/ (v20.0.0 or later)"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version must be >= 20.0.0 (found: $(node -v))"
    exit 1
fi
print_success "Node.js $(node -v)"

# Check PNPM
if ! command -v pnpm &> /dev/null; then
    print_warning "PNPM not found, installing..."
    npm install -g pnpm@8.15.0
    print_success "PNPM installed"
else
    PNPM_VERSION=$(pnpm -v | cut -d. -f1)
    if [ "$PNPM_VERSION" -lt 8 ]; then
        print_warning "Updating PNPM to >= 8.15.0..."
        npm install -g pnpm@8.15.0
    fi
    print_success "PNPM $(pnpm -v)"
fi

# Check Git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    exit 1
fi
print_success "Git $(git --version | cut -d' ' -f3)"

echo

# Install dependencies
print_info "Installing dependencies..."
pnpm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

echo

# Build packages
print_info "Building all packages..."
pnpm build

if [ $? -eq 0 ]; then
    print_success "Packages built successfully"
else
    print_error "Build failed"
    exit 1
fi

echo

# Run tests
print_info "Running tests..."
pnpm test

if [ $? -eq 0 ]; then
    print_success "All tests passed"
else
    print_warning "Some tests failed (continuing setup)"
fi

echo

# Setup Git hooks
print_info "Setting up Git hooks..."
if [ -d ".git" ]; then
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook: Run linter and tests
echo "Running pre-commit checks..."

# Lint staged files
pnpm lint-staged

# Run tests
pnpm test

if [ $? -ne 0 ]; then
    echo "❌ Pre-commit checks failed"
    exit 1
fi

echo "✅ Pre-commit checks passed"
EOF
    chmod +x .git/hooks/pre-commit
    print_success "Git hooks installed"
else
    print_warning "Not a Git repository, skipping hooks"
fi

echo

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << 'EOF'
# NLCI Environment Configuration
NODE_ENV=development

# Logging
LOG_LEVEL=debug

# VS Code Extension
VSCODE_DEBUG=true

# Optional: Custom model paths
# EMBEDDING_MODEL_PATH=./models/custom-model
EOF
    print_success ".env file created"
else
    print_info ".env file already exists"
fi

echo

# Summary
echo "════════════════════════════════════"
echo -e "${GREEN}Setup Complete!${NC}"
echo "════════════════════════════════════"
echo
echo "Next steps:"
echo "  1. Start CLI in dev mode:          pnpm --filter @nlci/cli dev"
echo "  2. Start VS Code extension:        pnpm --filter vscode-extension dev"
echo "  3. Run tests:                      pnpm test"
echo "  4. Run benchmarks:                 ./scripts/benchmark.sh"
echo "  5. Read docs:                      cat docs/getting-started.md"
echo
echo "Available commands:"
echo "  pnpm build         - Build all packages"
echo "  pnpm test          - Run all tests"
echo "  pnpm lint          - Run linter"
echo "  pnpm format        - Format code"
echo "  pnpm clean         - Clean build artifacts"
echo
echo "Happy coding! 🎉"
