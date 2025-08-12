# Git Workflow

## Executive Summary

Git workflow and branching strategy for the Settings Extension project, including branch naming conventions, commit message standards, pull request processes, and release procedures. Ensures consistent collaboration and maintainable version history.

## Scope

- **Applies to**: All Git operations and repository management
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Branching Strategy

We use **Git Flow** with simplified branch naming:

```
Repository Structure:
├── main              # Production-ready code
├── develop           # Development integration branch
├── feature/*         # Feature development branches
├── bugfix/*          # Bug fix branches
├── hotfix/*          # Production hotfix branches
└── release/*         # Release preparation branches
```

### Branch Types

#### Main Branch

- **Purpose**: Production-ready code
- **Protection**: Always protected, no direct pushes
- **Merges**: Only from `release/*` or `hotfix/*` branches
- **Tags**: All releases are tagged here

#### Develop Branch

- **Purpose**: Integration of completed features
- **Merges**: From `feature/*` and `bugfix/*` branches
- **Testing**: Continuous integration runs on all commits

#### Feature Branches

- **Naming**: `feature/description-in-kebab-case`
- **Base**: `develop`
- **Merge Target**: `develop`
- **Lifespan**: Until feature is complete and merged

#### Bug Fix Branches

- **Naming**: `bugfix/description-in-kebab-case`
- **Base**: `develop`
- **Merge Target**: `develop`
- **Lifespan**: Until bug is fixed and merged

#### Hotfix Branches

- **Naming**: `hotfix/version-or-description`
- **Base**: `main`
- **Merge Target**: Both `main` and `develop`
- **Purpose**: Critical production fixes

#### Release Branches

- **Naming**: `release/v1.2.3`
- **Base**: `develop`
- **Merge Target**: Both `main` and `develop`
- **Purpose**: Release preparation and stabilization

## Branch Naming Conventions

### Format Rules

```bash
# Feature branches
feature/add-dark-mode-support
feature/implement-settings-sync
feature/create-options-page

# Bug fix branches
bugfix/fix-storage-quota-error
bugfix/resolve-popup-crash
bugfix/correct-validation-logic

# Hotfix branches
hotfix/v1.2.1-critical-security-fix
hotfix/storage-corruption-fix

# Release branches
release/v1.3.0
release/v2.0.0-beta
```

### Naming Guidelines

- Use **kebab-case** (lowercase with hyphens)
- Be descriptive but concise
- Include issue numbers when applicable: `feature/123-add-export-feature`
- Avoid personal identifiers: ❌ `feature/john-new-ui` ✅ `feature/redesign-popup-ui`

## Commit Message Standards

### Format

We follow the **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

```bash
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style changes (formatting, missing semicolons, etc.)
refactor: # Code refactoring without feature changes
test:     # Adding or modifying tests
chore:    # Build process or auxiliary tool changes
perf:     # Performance improvements
ci:       # CI/CD configuration changes
```

### Examples

#### Good Commit Messages

```bash
feat: add dark mode toggle to popup interface

Implements user-requested dark mode with automatic OS theme detection.
Includes toggle in popup and persistence in storage.

Closes #42

fix(storage): handle quota exceeded error gracefully

- Add error handling for QUOTA_EXCEEDED_ERR
- Implement automatic cleanup of old data
- Display user-friendly error message

Fixes #87

docs: update API documentation for settings manager

- Add JSDoc comments to all public methods
- Include usage examples
- Document error conditions

test: add cross-browser compatibility tests

Adds automated testing for Chrome, Firefox, and Edge:
- Service worker lifecycle tests
- Storage API compatibility tests
- UI rendering consistency tests

refactor: extract message handling into separate module

Improves code organization and testability by separating
message routing logic from background script main logic.

chore: update build dependencies to latest versions

- webpack: 5.88.0 → 5.89.0
- eslint: 8.50.0 → 8.51.0
- prettier: 3.0.0 → 3.0.1
```

#### Bad Commit Messages

```bash
❌ fix bug
❌ Update stuff
❌ WIP
❌ Fixed the thing John mentioned
❌ Lots of changes
❌ asdf
❌ Final commit
```

### Commit Message Rules

1. **Use imperative mood**: "Add feature" not "Added feature"
2. **First line ≤ 50 characters**: Keep subject line concise
3. **Capitalize first letter**: "Add feature" not "add feature"
4. **No period at end**: "Add feature" not "Add feature."
5. **Body lines ≤ 72 characters**: Wrap long descriptions
6. **Reference issues**: Include "Closes #123" or "Fixes #456"

## Development Workflow

### Starting New Work

```bash
# 1. Update local repository
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/add-export-functionality

# 3. Work on feature
# ... make changes ...

# 4. Commit changes
git add .
git commit -m "feat: implement settings export functionality"

# 5. Push branch
git push -u origin feature/add-export-functionality
```

### Daily Development

```bash
# Regular commits
git add specific-files  # Stage specific files, not everything
git commit -m "feat: add validation for export data"

# Keep branch updated
git checkout develop
git pull origin develop
git checkout feature/add-export-functionality
git rebase develop  # Preferred over merge for feature branches

# Push updates
git push origin feature/add-export-functionality
```

### Finishing Work

```bash
# 1. Final rebase and cleanup
git checkout develop
git pull origin develop
git checkout feature/add-export-functionality
git rebase develop

# 2. Interactive rebase to clean up commits (optional)
git rebase -i develop

# 3. Push final version
git push origin feature/add-export-functionality

# 4. Create pull request (see Pull Request section)
```

## Pull Request Process

### Creating Pull Requests

#### PR Title Format

```
<type>[scope]: <description>

Examples:
feat: add settings export functionality
fix(popup): resolve crash on theme change
docs: update developer setup guide
```

#### PR Template

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Cross-browser testing completed
- [ ] Manual testing completed

## Checklist

- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable)

Include screenshots of UI changes.

## Related Issues

Closes #123
Related to #456

## Additional Notes

Any additional information reviewers should know.
```

### Review Process

#### For Authors

1. **Self-review first**: Review your own PR before requesting review
2. **Keep PRs small**: Aim for <400 lines of changes when possible
3. **Write descriptive PR description**: Explain what, why, and how
4. **Respond to feedback promptly**: Address comments within 2 business days
5. **Update PR as needed**: Push additional commits to address feedback

#### For Reviewers

1. **Review promptly**: Aim to review within 1 business day
2. **Be constructive**: Provide specific, actionable feedback
3. **Check for**:
   - Code follows standards
   - Tests are adequate
   - Documentation is updated
   - No security issues
   - Performance implications

### PR Approval Requirements

- **Minimum 1 approval** from code owners
- **All CI checks must pass**
- **No unresolved conversations**
- **Branch must be up-to-date** with target branch

### Merging Strategy

We use **Squash and Merge** for feature branches:

```bash
# This creates a single commit on develop:
feat: add settings export functionality (#123)

* feat: add export button to options page
* feat: implement data serialization
* test: add export functionality tests
* docs: update user guide with export steps

Co-authored-by: Reviewer Name <reviewer@email.com>
```

## Release Workflow

### Preparing Releases

```bash
# 1. Create release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.3.0

# 2. Update version numbers
npm version minor  # Updates package.json
# Update manifest.json version manually
git add package.json manifest.json
git commit -m "chore: bump version to 1.3.0"

# 3. Final testing and bug fixes
# ... fix any issues found in testing ...

# 4. Push release branch
git push origin release/v1.3.0

# 5. Create PR to main
# Title: "Release v1.3.0"
```

### Completing Releases

```bash
# After PR approval and merge to main:

# 1. Tag the release
git checkout main
git pull origin main
git tag -a v1.3.0 -m "Release version 1.3.0

- Add settings export functionality
- Improve error handling
- Update documentation"

git push origin v1.3.0

# 2. Merge back to develop
git checkout develop
git merge main
git push origin develop

# 3. Clean up release branch
git branch -d release/v1.3.0
git push origin --delete release/v1.3.0
```

### Hotfix Workflow

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/v1.2.1-security-fix

# 2. Implement fix
# ... make necessary changes ...
git commit -m "fix: resolve security vulnerability in storage handling"

# 3. Update version
npm version patch
git add package.json manifest.json
git commit -m "chore: bump version to 1.2.1"

# 4. Push and create PR to main
git push origin hotfix/v1.2.1-security-fix

# 5. After merge to main, also merge to develop
git checkout develop
git merge main
git push origin develop

# 6. Tag and clean up
git checkout main
git tag -a v1.2.1 -m "Hotfix v1.2.1 - Security fix"
git push origin v1.2.1
git branch -d hotfix/v1.2.1-security-fix
git push origin --delete hotfix/v1.2.1-security-fix
```

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix the issues and try again."
  exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Please fix the failing tests and try again."
  exit 1
fi

# Check commit message format (if using commitizen)
if command -v commitizen >/dev/null 2>&1; then
  exec < /dev/tty && npx cz --hook || true
fi

echo "✅ Pre-commit checks passed"
```

### Commit Message Hook

```bash
#!/bin/sh
# .git/hooks/commit-msg

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
  echo "❌ Invalid commit message format"
  echo "Format should be: type(scope): description"
  echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci"
  echo "Example: feat(popup): add dark mode toggle"
  exit 1
fi

echo "✅ Commit message format is valid"
```

## Repository Maintenance

### Regular Cleanup

```bash
# Clean up merged branches (monthly)
git checkout main
git pull origin main
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d

# Clean up remote tracking branches
git remote prune origin

# Clean up local repository
git gc --prune=now
git repack -ad
```

### Branch Protection Rules

Configure these in GitHub settings:

**Main Branch:**

- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators
- Allow force pushes: ❌
- Allow deletions: ❌

**Develop Branch:**

- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators: ❌
- Allow force pushes: ❌
- Allow deletions: ❌

## Troubleshooting

### Common Git Issues

#### Merge Conflicts

```bash
# When rebasing
git checkout feature/my-feature
git rebase develop

# Fix conflicts in files, then:
git add .
git rebase --continue

# Or abort and try different approach:
git rebase --abort
```

#### Wrong Base Branch

```bash
# If you branched from main instead of develop
git checkout feature/my-feature
git rebase --onto develop main feature/my-feature
```

#### Accidental Commit to Wrong Branch

```bash
# Move last commit to correct branch
git checkout wrong-branch
git reset --hard HEAD~1  # Remove commit from wrong branch

git checkout correct-branch
git cherry-pick <commit-hash>  # Apply commit to correct branch
```

#### Large Files

```bash
# Remove large files from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch large-file.zip' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (only if safe)
git push origin --force --all
```

## Best Practices

### Do's ✅

- **Commit early and often** with meaningful messages
- **Keep commits atomic** - one logical change per commit
- **Write descriptive PR descriptions** explaining context
- **Rebase feature branches** to keep history clean
- **Review your own PRs** before requesting review
- **Update documentation** with code changes
- **Test thoroughly** before pushing

### Don'ts ❌

- **Don't force push** to shared branches (main/develop)
- **Don't commit secrets** or sensitive data
- **Don't mix unrelated changes** in single commits
- **Don't use git add .** blindly - stage files intentionally
- **Don't leave PRs stale** - respond to feedback promptly
- **Don't merge without review** except for trivial documentation fixes

## Tools and Automation

### Recommended Tools

```json
{
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0",
    "commitizen": "^4.2.0",
    "cz-conventional-changelog": "^3.3.0",
    "@commitlint/cli": "^17.0.0",
    "@commitlint/config-conventional": "^17.0.0"
  },
  "scripts": {
    "commit": "cz",
    "prepare": "husky install"
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

### GitHub Actions Integration

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Lint commit messages
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to HEAD --verbose

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm test
```

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Pro Git Book](https://git-scm.com/book)

## Revision History

| Date       | Author         | Changes                            |
| ---------- | -------------- | ---------------------------------- |
| 2025-08-11 | Developer Team | Initial git workflow documentation |
