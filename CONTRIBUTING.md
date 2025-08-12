# Contributing to Settings Extension

Thank you for your interest in contributing to the Settings Extension! This document provides guidelines and information for contributors.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and considerate in your interactions with other community members.

## 📋 How to Contribute

### Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/yourusername/settings-extension/issues) to see if the problem has already been reported.

When creating a bug report, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, browser, extension version)
- **Console logs** or error messages

### Requesting Features

Feature requests are welcome! Please:

1. Check if the feature already exists or is being discussed
2. Create an issue with the "enhancement" label
3. Provide a clear description of the feature and its benefits
4. Explain any specific use cases

### Pull Requests

We welcome pull requests! Please follow these guidelines:

1. **Fork the repository** and create a new branch
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if necessary
5. **Submit a pull request** with a clear description

## 🏗️ Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Chrome or Firefox browser

### Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/yourusername/settings-extension.git
   cd settings-extension
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development environment:

   ```bash
   npm run dev
   ```

4. Load the extension in your browser:
   - **Chrome**: Go to `chrome://extensions/`, enable developer mode, and load unpacked
   - **Firefox**: Go to `about:debugging`, click "This Firefox", and load temporary add-on

## 📝 Coding Standards

### JavaScript/TypeScript

- Use ES6+ syntax
- Follow existing code formatting (Prettier configured)
- Write descriptive variable and function names
- Add JSDoc comments for public APIs
- Use async/await for asynchronous operations

### File Organization

- Keep related files in the same directory
- Use descriptive file names
- Follow existing project structure
- Place tests adjacent to implementation files

### Git Workflow

- Use descriptive commit messages
- Keep commits focused and atomic
- Reference issue numbers in commits when applicable
- Use conventional commit format:

  ```
  type(scope): description

  Examples:
  feat(api): add settings export functionality
  fix(ui): resolve popup positioning issue
  docs(readme): update installation instructions
  ```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- settings-manager.test.js
```

### Writing Tests

- Write tests for new features and bug fixes
- Use descriptive test names
- Follow the existing test structure
- Include edge cases and error scenarios
- Test both positive and negative cases

### Test Types

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete user workflows

## 📖 Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Document complex algorithms or business logic
- Include usage examples in documentation
- Keep documentation up to date with code changes

### README Updates

- Update README when adding new features
- Include screenshots for UI changes
- Update installation or usage instructions as needed

## 🌐 Browser Compatibility

### Testing Requirements

- Test changes in both Chrome and Firefox
- Verify functionality across different browser versions
- Test with different screen sizes and resolutions
- Ensure accessibility compliance

### Cross-Browser Guidelines

- Use WebExtension APIs consistently
- Test storage operations in both browsers
- Verify message passing works correctly
- Check for browser-specific quirks

## 📊 Performance Guidelines

### Best Practices

- Optimize storage operations
- Minimize memory usage in content scripts
- Use efficient data structures
- Implement lazy loading where appropriate
- Profile performance impact of changes

### Performance Targets

- Settings load time: <100ms
- UI response time: <500ms
- Memory usage: <10MB per tab
- Extension startup time: <1s

## 🔒 Security Guidelines

### Security Best Practices

- Never commit sensitive data (API keys, tokens)
- Validate all user inputs
- Use Content Security Policy appropriately
- Follow principle of least privilege
- Sanitize data before storage

### Security Review Process

- Security-sensitive changes require additional review
- Consider potential attack vectors
- Review permissions and access controls
- Test with malicious inputs

## 🚀 Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. Update version in `package.json` and `manifest.json`
2. Update `CHANGELOG.md` with release notes
3. Create a release branch
4. Test extensively across browsers
5. Create a pull request for review
6. Tag the release after merging

## 📞 Getting Help

### Community Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and community discussion
- **Discord**: [Join our community](https://discord.gg/settings-extension) (Coming Soon)

### Maintainer Contact

- Create an issue for project-related questions
- Tag maintainers in pull requests when review is needed
- Be patient and respectful when awaiting responses

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🎉 Recognition

Contributors will be recognized in:

- Release notes for their contributions
- `CONTRIBUTORS.md` file
- GitHub contributors graph
- Project documentation

Thank you for helping make Settings Extension better! 🚀

## 🔧 Troubleshooting

### Common Issues

**Extension won't load:**

- Check manifest.json syntax
- Verify file permissions
- Review browser console for errors

**Tests failing:**

- Run `npm install` to ensure dependencies are current
- Check for syntax errors in test files
- Verify test environment setup

**Build issues:**

- Clear `node_modules` and reinstall dependencies
- Check Node.js version compatibility
- Review build script configuration

### Debug Tips

- Enable extension developer mode
- Use browser developer tools
- Check extension console logs
- Test in incognito/private mode
- Verify with clean browser profile

For more specific help, please create an issue with detailed information about your problem.
