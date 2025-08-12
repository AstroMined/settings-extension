# Release Process

## Executive Summary

Complete guide for releasing the Settings Extension, covering version management, testing procedures, packaging, and distribution across Chrome Web Store and Firefox Add-ons. Includes automated workflows, quality gates, and rollback procedures.

## Scope

- **Applies to**: All release activities from development to production
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Release Types

### 1. Development Releases

- **Purpose**: Internal testing and validation
- **Frequency**: Continuous with each commit
- **Distribution**: Local development environments

### 2. Beta Releases

- **Purpose**: Community testing and feedback
- **Frequency**: Weekly or bi-weekly
- **Distribution**: Beta channels in stores

### 3. Stable Releases

- **Purpose**: General availability
- **Frequency**: Monthly or when critical features/fixes are ready
- **Distribution**: Main channels in both stores

### 4. Hotfix Releases

- **Purpose**: Critical bug fixes
- **Frequency**: As needed
- **Distribution**: Expedited release to main channels

## Pre-Release Checklist

### Code Quality Gates

```bash
# 1. All tests must pass
npm test
npm run test:coverage

# 2. Code quality checks
npm run lint
npm run format:check

# 3. Cross-browser validation
npm run test:chrome
npm run test:firefox
npm run validate

# 4. Build verification
npm run clean
npm run build
npm run package
```

### Documentation Requirements

- [ ] CHANGELOG.md updated with all changes
- [ ] Version number updated in package.json
- [ ] manifest.json version incremented
- [ ] README.md updated if needed
- [ ] API documentation updated (if applicable)
- [ ] Migration guides written (for breaking changes)

### Security Review

```bash
# Security audit
npm audit --audit-level moderate

# Check for sensitive data in build
grep -r "password\|secret\|token\|key" dist/ || echo "No secrets found"

# Validate permissions in manifest
cat manifest.json | jq '.permissions'
```

## Version Management

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Version Update Process

```bash
# Automated version update
npm version patch    # 1.0.0 -> 1.0.1
npm version minor    # 1.0.0 -> 1.1.0
npm version major    # 1.0.0 -> 2.0.0

# Manual version update (if needed)
# 1. Update package.json
# 2. Update manifest.json
# 3. Update CHANGELOG.md
```

### Version Synchronization

```javascript
// scripts/sync-versions.js
const fs = require("fs");
const path = require("path");

const packageJson = require("../package.json");
const manifestPath = path.join(__dirname, "../manifest.json");
const manifest = require(manifestPath);

// Update manifest version to match package.json
manifest.version = packageJson.version;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Version synchronized: ${packageJson.version}`);
```

## Build Process

### Development Build

```bash
# Development build with source maps
npm run build:dev

# Verify development build
ls -la dist/
npm run validate
```

### Production Build

```bash
# Clean previous builds
npm run clean

# Production build (optimized, no source maps)
npm run build

# Verify production build
npm run validate
ls -la dist/

# Test production build locally
npm run serve
```

### Build Artifacts

The build process creates:

- `dist/` - Built extension files
- `web-ext-artifacts/` - Packaged extension files
  - `settings-extension-chrome.zip` - Chrome package
  - `settings-extension-firefox.xpi` - Firefox package

## Testing Pipeline

### Automated Testing

```bash
#!/bin/bash
# scripts/test-pipeline.sh

set -e  # Exit on any error

echo "Starting test pipeline..."

# 1. Unit and integration tests
echo "Running unit tests..."
npm test

# 2. Coverage verification
echo "Checking coverage..."
npm run test:coverage

# 3. Cross-browser testing
echo "Testing in Chrome..."
npm run test:chrome

echo "Testing in Firefox..."
npm run test:firefox

# 4. Build verification
echo "Building extension..."
npm run build

# 5. Package validation
echo "Validating packages..."
npm run package:chrome
npm run package:firefox
npm run validate

echo "All tests passed ✅"
```

### Manual Testing Checklist

#### Core Functionality

- [ ] Extension loads in both browsers
- [ ] Popup opens and displays correctly
- [ ] Options page accessible and functional
- [ ] Settings save and load properly
- [ ] Sync functionality works (if applicable)
- [ ] Content script injection works
- [ ] Background script operates correctly

#### Cross-Browser Testing

- [ ] Chrome stable
- [ ] Chrome beta (if available)
- [ ] Firefox stable
- [ ] Firefox Developer Edition
- [ ] Edge (Chromium)

#### Performance Testing

- [ ] Extension loads within 500ms
- [ ] Settings operations complete within 100ms
- [ ] Memory usage remains under 10MB
- [ ] No console errors or warnings

## Packaging

### Chrome Web Store Package

```bash
# Create Chrome package
npm run package:chrome

# This creates: web-ext-artifacts/settings-extension-chrome.zip

# Verify package contents
unzip -l web-ext-artifacts/settings-extension-chrome.zip
```

### Firefox Add-ons Package

```bash
# Create Firefox package
npm run package:firefox

# This creates: web-ext-artifacts/settings-extension-firefox.xpi

# Verify package contents
unzip -l web-ext-artifacts/settings-extension-firefox.xpi
```

### Package Validation

```bash
# Validate both packages
npm run validate

# Manual validation
web-ext lint --source-dir=dist --verbose
```

## Store Submission

### Chrome Web Store

#### First-Time Setup

1. Create [Chrome Web Store Developer](https://chrome.google.com/webstore/devconsole/) account
2. Pay one-time registration fee ($5 USD)
3. Set up developer profile and privacy policy

#### Upload Process

1. Navigate to Chrome Web Store Developer Dashboard
2. Click "New Item" → Upload package
3. Upload `settings-extension-chrome.zip`
4. Fill in store listing details:
   - Title: "Settings Extension"
   - Summary: Brief description (132 characters max)
   - Description: Detailed description with features
   - Category: Productivity
   - Language: English (and others if localized)

#### Store Listing Assets

```bash
# Required images (create in assets/ directory)
assets/
├── icon-128.png     # Main icon (128x128)
├── screenshot-1.png # Screenshots (1280x800 or 640x400)
├── screenshot-2.png
├── screenshot-3.png
└── promo-440x280.png # Promotional image
```

#### Review Process

- **Automated review**: Usually within 24 hours
- **Manual review**: May take 3-7 days for new extensions
- **Status tracking**: Available in developer dashboard

### Firefox Add-ons

#### First-Time Setup

1. Create [Firefox Add-ons](https://addons.mozilla.org/developers/) account
2. Complete developer profile
3. Review Mozilla policies

#### Upload Process

1. Navigate to Firefox Add-ons Developer Hub
2. Click "Submit a New Add-on"
3. Upload `settings-extension-firefox.xpi`
4. Choose distribution channel:
   - **Listed**: Public listing on addons.mozilla.org
   - **Unlisted**: Private distribution with signed package

#### Add-on Listing Details

- Name: "Settings Extension"
- Summary: Brief description (250 characters max)
- Description: Detailed markdown description
- Categories: Productivity, Other
- Tags: settings, configuration, productivity

#### Review Process

- **Automated review**: Usually within minutes for listed add-ons
- **Human review**: Required for certain permissions or flagged content
- **Approval time**: Typically 1-3 days

## Release Deployment

### Automated Release Script

```bash
#!/bin/bash
# scripts/release.sh

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  exit 1
fi

set -e

echo "Starting release process for version $VERSION..."

# 1. Update version
npm version $VERSION --no-git-tag-version

# 2. Update manifest
node scripts/sync-versions.js

# 3. Run full test suite
npm run test:all

# 4. Build and package
npm run clean
npm run build
npm run package

# 5. Create git tag
git add package.json manifest.json CHANGELOG.md
git commit -m "Release version $VERSION"
git tag -a "v$VERSION" -m "Release version $VERSION"

# 6. Push to repository
git push origin main
git push origin "v$VERSION"

echo "Release $VERSION completed successfully!"
echo "Packages are ready in web-ext-artifacts/"
```

### Manual Release Steps

```bash
# 1. Prepare release
./scripts/test-pipeline.sh
./scripts/release.sh patch

# 2. Upload to stores
# - Chrome: Upload settings-extension-chrome.zip
# - Firefox: Upload settings-extension-firefox.xpi

# 3. Update release notes
# - Create GitHub release
# - Update store descriptions if needed

# 4. Monitor deployment
# - Check store approval status
# - Verify extension availability
# - Monitor error reports
```

## Post-Release Activities

### Monitoring

```bash
# Check extension status
curl -s "https://chrome.google.com/webstore/detail/[EXTENSION_ID]" | grep -o "Available in the Chrome Web Store"

# Monitor error reports
# - Chrome: Developer Dashboard → Statistics → Errors
# - Firefox: Developer Hub → Statistics → Usage
```

### Release Communication

1. **Internal team notification**

   ```markdown
   🚀 Settings Extension v1.2.0 released!

   **Changes:**

   - New feature: Dark mode support
   - Bug fix: Storage sync issues
   - Performance: 20% faster loading

   **Links:**

   - Chrome: https://chrome.google.com/webstore/detail/[ID]
   - Firefox: https://addons.mozilla.org/firefox/addon/[ID]
   ```

2. **User announcement**
   - Update README.md with latest version
   - Post on relevant forums/communities
   - Social media announcement (if applicable)

3. **Documentation updates**
   - Update user documentation
   - Refresh screenshots if UI changed
   - Update API documentation

### Release Metrics

Track these metrics post-release:

- Installation/adoption rate
- User reviews and ratings
- Crash reports and errors
- Performance metrics
- Support ticket volume

## Rollback Procedures

### Identifying Issues

Monitor for:

- Increased error reports
- Negative user reviews
- Performance degradation
- Security vulnerabilities

### Emergency Rollback

#### Chrome Web Store

1. Navigate to Developer Dashboard
2. Select extension → "Package" tab
3. Click "Rollback to previous version"
4. Confirm rollback

#### Firefox Add-ons

1. Navigate to Developer Hub
2. Select add-on → "Manage Status and Versions"
3. Disable current version
4. Re-enable previous version

### Hotfix Process

```bash
# 1. Create hotfix branch
git checkout -b hotfix/v1.2.1 v1.2.0

# 2. Apply critical fix
# ... make necessary changes ...

# 3. Test fix
npm test
npm run test:chrome
npm run test:firefox

# 4. Release hotfix
./scripts/release.sh patch

# 5. Merge back to main
git checkout main
git merge hotfix/v1.2.1
```

## Release Schedule

### Regular Schedule

- **Beta releases**: Every Friday (if changes available)
- **Stable releases**: First Monday of each month
- **Hotfixes**: As needed (within 24 hours of critical issue)

### Release Windows

- **Best time**: Tuesday-Thursday, 10 AM - 2 PM PST
- **Avoid**: Fridays, weekends, holidays
- **Store considerations**: Chrome processes faster than Firefox

### Seasonal Considerations

- **Holiday slowdowns**: Expect delayed reviews in December/January
- **Store policies**: Both stores may have policy updates that affect releases

## Troubleshooting Releases

### Common Issues

1. **Package rejected**

   ```bash
   # Check validation errors
   npm run validate
   web-ext lint --source-dir=dist --verbose
   ```

2. **Version conflicts**

   ```bash
   # Ensure version consistency
   node scripts/sync-versions.js
   git status
   ```

3. **Permission issues**

   ```json
   // Verify manifest.json permissions
   {
     "permissions": ["storage", "activeTab"]
   }
   ```

4. **Build failures**
   ```bash
   # Clean rebuild
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Recovery Steps

1. **Identify the problem**
   - Check build logs
   - Review validation errors
   - Test locally

2. **Fix the issue**
   - Apply necessary changes
   - Re-run tests
   - Rebuild packages

3. **Re-release**
   - Increment patch version
   - Follow standard release process

## Security Considerations

### Pre-Release Security Audit

```bash
# Dependency audit
npm audit --audit-level moderate

# Check for secrets in code
find . -name "*.js" -not -path "./node_modules/*" | xargs grep -l "password\|secret\|token\|api_key"

# Validate permissions
node -e "console.log(JSON.stringify(require('./manifest.json').permissions, null, 2))"
```

### Store Security Requirements

Both stores require:

- No malicious code
- Minimal permissions
- Clear privacy policy
- Secure data handling

## References

- [Chrome Web Store Publishing](https://developer.chrome.com/webstore/publish/)
- [Firefox Add-on Distribution](https://extensionworkshop.com/documentation/publish/)
- [Semantic Versioning](https://semver.org/)
- [Web-ext CLI Reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)

## Revision History

| Date       | Author         | Changes                       |
| ---------- | -------------- | ----------------------------- |
| 2025-08-11 | Developer Team | Initial release process guide |
