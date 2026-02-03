#!/usr/bin/env bash
# NLCI Release Script
set -euo pipefail

echo "📦 NLCI Release Process"
echo "======================"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_error "Uncommitted changes detected"
    echo "Please commit or stash changes before releasing"
    exit 1
fi
print_success "Working directory clean"

# Check we're on main/master branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    print_warning "Not on main/master branch (current: $BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Ask for version bump type
echo
echo "Select version bump type:"
echo "  1) patch (e.g., 1.0.0 → 1.0.1)"
echo "  2) minor (e.g., 1.0.0 → 1.1.0)"
echo "  3) major (e.g., 1.0.0 → 2.0.0)"
echo "  4) custom version"
echo

read -p "Choice (1-4): " -n 1 -r
echo

BUMP_TYPE=""
case $REPLY in
    1) BUMP_TYPE="patch" ;;
    2) BUMP_TYPE="minor" ;;
    3) BUMP_TYPE="major" ;;
    4) 
        read -p "Enter version (e.g., 1.2.3): " CUSTOM_VERSION
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            print_error "Invalid version format"
            exit 1
        fi
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Calculate new version
if [ -n "$BUMP_TYPE" ]; then
    NEW_VERSION=$(pnpm version $BUMP_TYPE --no-git-tag-version --json | grep version | cut -d'"' -f4)
    git checkout -- package.json  # Revert the change
else
    NEW_VERSION=$CUSTOM_VERSION
fi

print_info "New version will be: $NEW_VERSION"
read -p "Proceed with release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Release cancelled"
    exit 0
fi

echo
print_info "Starting release process..."

# Run tests
echo
print_info "Running tests..."
if ! pnpm test; then
    print_error "Tests failed"
    exit 1
fi
print_success "Tests passed"

# Run linter
echo
print_info "Running linter..."
if ! pnpm lint; then
    print_error "Linting failed"
    exit 1
fi
print_success "Linting passed"

# Build all packages
echo
print_info "Building packages..."
if ! pnpm build; then
    print_error "Build failed"
    exit 1
fi
print_success "Build complete"

# Update versions in all package.json files
echo
print_info "Updating package versions..."

# Root package.json
npm version $NEW_VERSION --no-git-tag-version

# Update all workspace packages
for pkg in packages/*/package.json apps/*/package.json; do
    if [ -f "$pkg" ]; then
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$pkg'));
            pkg.version = '$NEW_VERSION';
            fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\\n');
        "
        print_success "Updated $(dirname $pkg)"
    fi
done

# Update CHANGELOG.md
echo
print_info "Updating CHANGELOG.md..."
DATE=$(date +%Y-%m-%d)

if [ ! -f "CHANGELOG.md" ]; then
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [$NEW_VERSION] - $DATE

### Added
- Initial release

EOF
else
    # Prepend new version section
    TEMP_FILE=$(mktemp)
    cat CHANGELOG.md > $TEMP_FILE
    cat > CHANGELOG.md << EOF
# Changelog

## [$NEW_VERSION] - $DATE

### Added
- (Add changes here)

### Changed
- (Add changes here)

### Fixed
- (Add changes here)

EOF
    tail -n +2 $TEMP_FILE >> CHANGELOG.md
    rm $TEMP_FILE
fi

print_success "CHANGELOG.md updated (please edit manually)"

# Git operations
echo
print_info "Creating Git commit and tag..."

git add .
git commit -m "chore: release v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

print_success "Commit and tag created"

# Push to remote
echo
print_warning "Ready to push to remote"
read -p "Push to remote? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin $BRANCH
    git push origin "v$NEW_VERSION"
    print_success "Pushed to remote"
else
    print_info "Skipped push (run manually: git push && git push --tags)"
fi

# Publish to npm
echo
print_warning "Ready to publish to npm"
read -p "Publish to npm? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Publishing packages..."
    
    # Publish each package
    for pkg in packages/core packages/shared; do
        if [ -f "$pkg/package.json" ]; then
            pushd $pkg > /dev/null
            npm publish --access public
            popd > /dev/null
            print_success "Published $pkg"
        fi
    done
    
    # Publish CLI
    if [ -f "apps/cli/package.json" ]; then
        pushd apps/cli > /dev/null
        npm publish --access public
        popd > /dev/null
        print_success "Published @nlci/cli"
    fi
    
    print_success "Published to npm"
else
    print_info "Skipped npm publish (run manually: pnpm publish -r)"
fi

# Summary
echo
echo "════════════════════════════════════"
echo -e "${GREEN}Release v$NEW_VERSION Complete!${NC}"
echo "════════════════════════════════════"
echo
echo "Next steps:"
echo "  1. Edit CHANGELOG.md with detailed changes"
echo "  2. Create GitHub release: https://github.com/OWNER/nlci/releases/new"
echo "  3. Announce on social media"
echo "  4. Update documentation website"
echo
echo "🎉 Congratulations on the release!"
