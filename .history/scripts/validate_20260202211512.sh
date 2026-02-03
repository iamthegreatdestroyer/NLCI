#!/usr/bin/env bash
# NLCI Pre-Commit Validation Script
set -euo pipefail

echo "🔍 NLCI Validation"
echo "=================="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED=0

print_error() {
    echo -e "${RED}✗${NC} $1"
    FAILED=1
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

section() {
    echo
    echo -e "${BLUE}$1${NC}"
    echo "$(printf '─%.0s' {1..60})"
}

# 1. TypeScript Compilation
section "TypeScript Compilation"
print_info "Checking TypeScript..."

if pnpm exec tsc --noEmit; then
    print_success "TypeScript compilation passed"
else
    print_error "TypeScript compilation failed"
fi

# 2. ESLint
section "ESLint"
print_info "Running ESLint..."

if pnpm lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
fi

# 3. Prettier
section "Prettier"
print_info "Checking code formatting..."

if pnpm exec prettier --check "**/*.{ts,tsx,js,jsx,json,md}"; then
    print_success "Code formatting is correct"
else
    print_warning "Code formatting issues found"
    print_info "Run 'pnpm format' to fix"
    FAILED=1
fi

# 4. Unit Tests
section "Unit Tests"
print_info "Running unit tests..."

if pnpm test; then
    print_success "All tests passed"
else
    print_error "Tests failed"
fi

# 5. Build
section "Build"
print_info "Building all packages..."

if pnpm build; then
    print_success "Build successful"
else
    print_error "Build failed"
fi

# 6. Dependency Check
section "Dependencies"
print_info "Checking for dependency issues..."

if pnpm audit --audit-level high; then
    print_success "No high/critical vulnerabilities"
else
    print_warning "Security vulnerabilities detected"
    print_info "Run 'pnpm audit' for details"
fi

# 7. Package Versions
section "Package Versions"
print_info "Checking package version consistency..."

ROOT_VERSION=$(node -p "require('./package.json').version")
INCONSISTENT=0

for pkg in packages/*/package.json apps/*/package.json; do
    if [ -f "$pkg" ]; then
        PKG_VERSION=$(node -p "require('./$pkg').version")
        PKG_NAME=$(node -p "require('./$pkg').name")
        
        if [ "$PKG_VERSION" != "$ROOT_VERSION" ]; then
            print_error "$PKG_NAME version mismatch: $PKG_VERSION (expected $ROOT_VERSION)"
            INCONSISTENT=1
        fi
    fi
done

if [ $INCONSISTENT -eq 0 ]; then
    print_success "All package versions consistent ($ROOT_VERSION)"
else
    FAILED=1
fi

# 8. License Headers
section "License Headers"
print_info "Checking license headers in source files..."

MISSING=0
for file in packages/*/src/**/*.ts apps/*/src/**/*.ts; do
    if [ -f "$file" ] && ! grep -q "Copyright" "$file"; then
        if [ $MISSING -eq 0 ]; then
            print_warning "Missing license headers:"
        fi
        echo "  - $file"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -eq 0 ]; then
    print_success "All source files have license headers"
else
    print_warning "$MISSING file(s) missing license headers"
fi

# 9. Documentation Links
section "Documentation"
print_info "Checking documentation links..."

BROKEN=0
for file in docs/*.md README.md; do
    if [ -f "$file" ]; then
        # Check for broken internal links
        while IFS= read -r line; do
            if [[ $line =~ \]\(([^)]+)\) ]]; then
                link="${BASH_REMATCH[1]}"
                
                # Skip external links
                if [[ $link =~ ^https?:// ]]; then
                    continue
                fi
                
                # Check if file exists
                if [[ ! -f "$link" ]] && [[ ! -d "$link" ]]; then
                    if [ $BROKEN -eq 0 ]; then
                        print_warning "Broken documentation links:"
                    fi
                    echo "  - $file: $link"
                    BROKEN=$((BROKEN + 1))
                fi
            fi
        done < "$file"
    fi
done

if [ $BROKEN -eq 0 ]; then
    print_success "All documentation links valid"
else
    print_warning "$BROKEN broken link(s) found"
fi

# 10. Git Status
section "Git Status"
print_info "Checking for uncommitted changes..."

if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected"
    git status --short
else
    print_success "Working directory clean"
fi

# Summary
echo
echo "════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All Validations Passed${NC}"
    echo "════════════════════════════════════"
    echo
    echo "Ready to commit! 🚀"
    exit 0
else
    echo -e "${RED}❌ Validation Failed${NC}"
    echo "════════════════════════════════════"
    echo
    echo "Please fix the issues above before committing."
    exit 1
fi
