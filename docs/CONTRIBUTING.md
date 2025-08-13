# Contributing to Settings Extension

## Executive Summary

Thank you for your interest in contributing to the Settings Extension project! We welcome contributions from developers of all skill levels and backgrounds. This guide will help you get started and ensure your contributions can be integrated smoothly.

## Scope

- **Applies to**: All contributors to the Settings Extension project
- **Last Updated**: 2025-08-13
- **Status**: Approved

## Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork**: `git clone https://github.com/yourusername/settings-extension.git`
3. **Set up development environment**: Follow our [Local Setup Guide](developer/workflows/local-setup.md)
4. **Create a feature branch**: `git checkout -b feature/your-feature-name`
5. **Make your changes** following our [Coding Standards](developer/conventions/coding-standards.md)
6. **Test your changes**: `npm test && npm run test:chrome && npm run test:firefox`
7. **Submit a pull request** following our [Git Workflow](developer/conventions/git-workflow.md)

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Contribution Types](#contribution-types)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to a code of conduct adapted from the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Reporting

If you experience or witness unacceptable behavior, please report it by emailing [maintainers@settings-extension.dev]. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 16+** and **npm 8+**
- **Git** configured with your name and email
- **Chrome** and **Firefox** browsers for testing
- A **GitHub account** for submitting contributions

### Development Setup

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/yourusername/settings-extension.git
   cd settings-extension
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Verify setup**:

   ```bash
   npm run build
   npm test
   npm run validate
   ```

4. **Load extension in browser**:
   - Chrome: Open `chrome://extensions/`, enable "Developer mode", click "Load unpacked", select `dist/` folder
   - Firefox: Open `about:debugging`, click "Load Temporary Add-on", select `dist/manifest.json`

### Project Structure Overview

```
settings-extension/
├── src/                    # Source code (when implemented)
├── lib/                    # Core library modules
├── test/                   # Test files
├── docs/                   # Documentation
│   ├── architecture/       # System design docs
│   ├── user/              # User-facing documentation
│   └── developer/         # Developer guides (this section)
├── config/                # Configuration files
├── dist/                  # Build output
└── scripts/               # Build and utility scripts
```

## Development Process

### Workflow Overview

We use **Git Flow** with the following branches:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: Feature development branches
- **`bugfix/*`**: Bug fix branches
- **`hotfix/*`**: Critical production fixes

### Step-by-Step Process

1. **Choose or create an issue**:
   - Look for issues labeled `good first issue` or `help wanted`
   - Create new issues for bugs or feature requests
   - Discuss significant changes in issues before starting

2. **Create a branch**:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

3. **Make changes**:
   - Follow our [Coding Standards](developer/conventions/coding-standards.md)
   - Write tests for new functionality
   - Update documentation as needed

4. **Test your changes**:

   ```bash
   npm run lint              # Code quality
   npm test                  # Unit tests
   npm run test:chrome       # Chrome testing
   npm run test:firefox      # Firefox testing
   npm run build            # Build verification
   ```

5. **Commit changes**:

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Keep branch updated**:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature-name
   git rebase develop
   ```

7. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## Contribution Types

### Code Contributions

**New Features**

- Implement new functionality
- Follow feature request templates
- Include comprehensive tests
- Update user documentation

**Bug Fixes**

- Fix reported issues
- Include regression tests
- Verify fix across browsers
- Update relevant documentation

**Performance Improvements**

- Optimize existing code
- Include performance benchmarks
- Verify no functionality regression
- Document performance gains

### Documentation Contributions

**User Documentation**

- User guides and tutorials
- API reference updates
- How-to guides
- Conceptual explanations

**Developer Documentation**

- Code comments and JSDoc
- Architecture documentation
- Development workflows
- Best practices guides

**Examples and Samples**

- Code examples
- Configuration samples
- Use case demonstrations
- Integration guides

### Testing Contributions

**Test Coverage**

- Unit tests for untested code
- Integration test scenarios
- Cross-browser compatibility tests
- Performance test suites

**Test Infrastructure**

- Testing utilities and helpers
- Automated test pipelines
- Test data and fixtures
- Testing documentation

### Infrastructure Contributions

**Build and Tooling**

- Build system improvements
- Development tool enhancements
- CI/CD pipeline updates
- Automation scripts

**Project Maintenance**

- Dependency updates
- Security vulnerability fixes
- Code cleanup and refactoring
- Issue triage and management

## Pull Request Process

### Before Submitting

**Self-Review Checklist**:

- [ ] Code follows project [Coding Standards](developer/conventions/coding-standards.md)
- [ ] All tests pass locally
- [ ] Changes are tested in both Chrome and Firefox
- [ ] Documentation is updated for user-facing changes
- [ ] Commit messages follow [conventional commit format](developer/conventions/git-workflow.md#commit-message-standards)
- [ ] No sensitive data or secrets are included
- [ ] Branch is up-to-date with target branch

### PR Template

Use this template when creating pull requests:

```markdown
## Description

Brief description of what this PR does and why it's needed.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code cleanup/refactoring

## How to Test

Step-by-step instructions for testing the changes:

1. Step one
2. Step two
3. Expected result

## Testing Completed

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing in Chrome
- [ ] Manual testing in Firefox
- [ ] Cross-platform testing (if applicable)
- [ ] Performance testing (if applicable)

## Screenshots

Include screenshots of UI changes or new features.

## Related Issues

- Closes #123
- Related to #456
- Fixes #789

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Additional Notes

Any additional information that reviewers should know.
```

### Review Process

**What Reviewers Look For**:

- Code quality and adherence to standards
- Test coverage and quality
- Documentation completeness
- Security considerations
- Performance implications
- Browser compatibility
- User experience impact

**Review Timeline**:

- Initial review within 2 business days
- Follow-up reviews within 1 business day
- Authors should respond to feedback within 2 business days

**Approval Requirements**:

- At least 1 approval from a code owner
- All automated checks must pass
- No unresolved review conversations
- Branch must be up-to-date with target

## Testing Requirements

### Required Testing

**Unit Tests**

```bash
# All unit tests must pass
npm test

# Coverage must be ≥80%
npm run test:coverage
```

**Cross-Browser Testing**

```bash
# Test in Chrome
npm run test:chrome

# Test in Firefox
npm run test:firefox

# Test in both browsers
npm run test:all
```

**Code Quality**

```bash
# Linting must pass
npm run lint

# Formatting must be correct
npm run format:check

# Extension validation must pass
npm run validate
```

### Test Writing Guidelines

**For New Features**:

- Write unit tests for all new functions
- Include integration tests for component interactions
- Add cross-browser compatibility tests
- Test error conditions and edge cases

**For Bug Fixes**:

- Write regression tests that fail without the fix
- Verify tests pass with the fix
- Test related functionality for side effects

**Test Structure Example**:

```javascript
describe("SettingsManager", () => {
  let settingsManager;
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;
    settingsManager = new SettingsManager();
  });

  describe("saveSettings", () => {
    test("should save valid settings to storage", async () => {
      const settings = { theme: "dark", notifications: true };

      const result = await settingsManager.saveSettings(settings);

      expect(result.success).toBe(true);

      const stored = await mockChrome.storage.local.get(["settings"]);
      expect(stored.settings).toEqual(settings);
    });

    test("should handle storage errors gracefully", async () => {
      mockChrome.storage.local.simulateError("QUOTA_EXCEEDED");

      const result = await settingsManager.saveSettings({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("quota");
    });
  });
});
```

## Documentation

### When to Update Documentation

**Always update documentation for**:

- New features or functionality
- Changes to existing APIs
- New configuration options
- Changes to user workflows
- Breaking changes
- Security considerations

### Documentation Types

**User Documentation** (`docs/user/`):

- Getting started guides
- How-to instructions
- API reference
- Troubleshooting guides

**Developer Documentation** (`docs/developer/`):

- Setup and workflow guides
- Architecture explanations
- Contributing guidelines
- API implementation details

**Code Documentation**:

- JSDoc comments for public APIs
- Inline comments for complex logic
- README files for modules
- Configuration examples

### Documentation Standards

**Writing Style**:

- Clear, concise language
- Active voice when possible
- Step-by-step instructions
- Examples and code samples

**Structure**:

- Executive summary for each document
- Table of contents for long documents
- Consistent formatting and headings
- Cross-references to related documentation

**Maintenance**:

- Keep documentation up-to-date with code changes
- Review documentation during code reviews
- Test all code examples and instructions
- Update screenshots when UI changes

## Issue Reporting

### Bug Reports

Use this template for bug reports:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**

- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 118, Firefox 119]
- Extension Version: [e.g. 1.2.3]

**Additional Context**
Add any other context about the problem here.

**Console Logs**
Include relevant console error messages or logs.
```

### Feature Requests

Use this template for feature requests:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation Ideas**
If you have ideas about how this could be implemented, please share them.
```

### Issue Labels

We use these labels to categorize issues:

**Type Labels**:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `performance`: Performance improvements
- `security`: Security-related issues

**Priority Labels**:

- `priority:high`: High priority issues
- `priority:medium`: Medium priority issues
- `priority:low`: Low priority issues

**Status Labels**:

- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `wontfix`: This will not be worked on
- `duplicate`: This issue or pull request already exists

**Component Labels**:

- `component:background`: Background script issues
- `component:content`: Content script issues
- `component:popup`: Popup interface issues
- `component:options`: Options page issues
- `component:storage`: Storage-related issues

## Community

### Communication Channels

**GitHub Issues**: Primary place for bug reports, feature requests, and project discussions

**Discussions**: Use GitHub Discussions for:

- General questions about the project
- Ideas and brainstorming
- Show and tell
- Community help

### Getting Help

**For Contributors**:

- Check existing [documentation](developer/README.md)
- Search existing issues and discussions
- Ask questions in GitHub Discussions
- Reach out to maintainers for guidance

**For Users**:

- Check [user documentation](user/README.md)
- Look at [troubleshooting guides](developer/guides/troubleshooting.md)
- Search existing issues
- Create new issue if problem persists

### Recognition

We value all contributions! Contributors are recognized through:

- **Contributors list** in README.md
- **Commit co-authorship** for collaborative work
- **Release notes** mentioning significant contributions
- **GitHub contributor badges** on the repository

### Maintainer Responsibilities

**Code Owners**:

- Review pull requests promptly
- Provide constructive feedback
- Maintain coding standards
- Guide architectural decisions

**Community Managers**:

- Respond to issues and discussions
- Help new contributors get started
- Maintain project documentation
- Organize community events

## Frequently Asked Questions

### General Questions

**Q: I'm new to open source. How can I start contributing?**
A: Look for issues labeled `good first issue` or `help wanted`. These are designed to be approachable for new contributors. Start with documentation improvements or small bug fixes to get familiar with the codebase.

**Q: How do I know if my contribution idea is wanted?**
A: Create an issue to discuss your idea before starting work. This helps ensure your contribution aligns with project goals and avoids duplicate effort.

**Q: Can I work on multiple issues at once?**
A: It's generally better to focus on one issue at a time, especially when starting out. This helps maintain quality and reduces conflicts.

### Technical Questions

**Q: The extension works in Chrome but not Firefox. What should I do?**
A: This is likely a cross-browser compatibility issue. Check our [Cross-Browser Testing Guide](developer/guides/cross-browser-testing.md) and ensure you're testing in both browsers.

**Q: My tests are failing locally but pass in CI. What's wrong?**
A: This often indicates environment-specific issues. Check Node.js versions, clear caches (`rm -rf node_modules package-lock.json && npm install`), and verify browser versions match CI.

**Q: How do I test my changes in a real browser?**
A: Follow our [Local Setup Guide](developer/workflows/local-setup.md) to load the extension in development mode in Chrome and Firefox.

### Process Questions

**Q: My PR has been open for a while without review. What should I do?**
A: Gently ping reviewers after 3-4 business days. Ensure your PR is complete, tests pass, and description is clear.

**Q: I made a mistake in my commit message. Can I fix it?**
A: For the most recent commit: `git commit --amend`. For older commits: `git rebase -i`. Be careful with force pushing to shared branches.

**Q: Should I update my branch with the latest changes?**
A: Yes, regularly rebase your feature branch on the latest develop branch to avoid conflicts and ensure compatibility.

## Resources

### Documentation

- **[Complete Documentation Hub](README.md)** - Main navigation and documentation map
- [Developer Documentation](developer/README.md) - Complete developer guides
- [User Documentation](user/README.md) - End-user guides and references
- [Architecture Documentation](architecture/README.md) - System design and structure
- [Documentation Map](DOCUMENTATION-MAP.md) - Cross-reference relationships and navigation paths

### External Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtension APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [JavaScript Testing with Jest](https://jestjs.io/docs/getting-started)
- [Git Documentation](https://git-scm.com/doc)

### Tools and Setup

- [Node.js Installation](https://nodejs.org/en/download/)
- [Git Installation](https://git-scm.com/downloads)
- [VS Code](https://code.visualstudio.com/) with recommended extensions
- [Chrome for Developers](https://www.google.com/chrome/dev/)
- [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Thank You!

Your contributions make this project better for everyone. Whether you're fixing bugs, adding features, improving documentation, or helping other users, your efforts are appreciated and valued.

Welcome to the Settings Extension community! 🎉

## References

- [Complete Documentation Hub](README.md) - Main navigation and documentation map
- [Developer Documentation](developer/README.md) - Complete developer guides
- [User Documentation](user/README.md) - End-user guides and references
- [Architecture Documentation](architecture/README.md) - System design and structure
- [Documentation Map](DOCUMENTATION-MAP.md) - Cross-reference relationships and navigation paths
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtension APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [JavaScript Testing with Jest](https://jestjs.io/docs/getting-started)
- [Git Documentation](https://git-scm.com/doc)
- [Node.js Installation](https://nodejs.org/en/download/)
- [VS Code](https://code.visualstudio.com/) with recommended extensions
- [Chrome for Developers](https://www.google.com/chrome/dev/)
- [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)

## Revision History

| Date       | Author             | Changes                                        |
| ---------- | ------------------ | ---------------------------------------------- |
| 2025-08-13 | Documentation Team | Initial contributing guide                     |
| 2025-08-13 | Documentation Team | Added References and Revision History sections |

---

_This contributing guide is a living document. If you find ways to improve it, please submit a pull request or open an issue with suggestions._
