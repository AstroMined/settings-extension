# Documentation Guide

## Executive Summary

This guide provides comprehensive instructions for creating, maintaining, and contributing to the Settings Extension documentation. It covers writing standards, organization principles, and practical procedures for keeping documentation current and useful.

## Scope

- **Applies to**: All documentation within the `/docs` directory and inline code documentation
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Documentation Framework Overview

Our documentation uses a hybrid three-framework approach to eliminate duplication while ensuring comprehensive coverage:

### Framework Selection Guide

| Content Type                          | Framework            | Location              | Purpose                             |
| ------------------------------------- | -------------------- | --------------------- | ----------------------------------- |
| System architecture, design decisions | **arc42**            | `/docs/architecture/` | Technical system documentation      |
| End-user guidance                     | **Diátaxis**         | `/docs/user/`         | User-facing documentation           |
| Development workflows, processes      | **Developer Guides** | `/docs/developer/`    | Practical development documentation |

### Decision Matrix: What Goes Where?

#### Architecture Documentation (arc42)

**Use when documenting:**

- System design and structure
- Technical constraints and decisions
- Component relationships
- Quality attributes and requirements
- Deployment and infrastructure
- Cross-cutting concerns

**Example topics:**

- "Why did we choose Manifest V3?"
- "How do components communicate?"
- "What are our performance requirements?"

#### User Documentation (Diátaxis)

**Use when creating:**

- **Tutorials**: Step-by-step learning guides for newcomers
- **How-to Guides**: Task-oriented solutions to specific problems
- **Reference**: Complete technical information for lookup
- **Explanations**: Conceptual understanding and background

**Example topics:**

- "Getting started with the extension" (Tutorial)
- "How to backup your settings" (How-to)
- "Settings types reference" (Reference)
- "How synchronization works" (Explanation)

#### Developer Documentation

**Use when documenting:**

- Development environment setup
- Team processes and workflows
- Debugging and troubleshooting
- Coding standards and conventions
- Tool usage and configuration

**Example topics:**

- "Setting up your development environment"
- "Running tests locally"
- "Code review process"
- "Release procedures"

## Writing Standards

### Document Structure

#### Standard Template

All documentation files must follow this template:

```markdown
# [Document Title]

## Executive Summary

[2-3 sentence overview of what this document covers and why it matters]

## Scope

- **Applies to**: [Specific components/versions this applies to]
- **Last Updated**: YYYY-MM-DD
- **Status**: Draft/Review/Approved

## [Main Content Sections]

[Organized with clear headers and subsections]

## Related Documentation

[Links to related documents with brief descriptions]

## Revision History

| Date       | Author      | Changes                |
| ---------- | ----------- | ---------------------- |
| YYYY-MM-DD | Author Name | Description of changes |
```

#### Content Organization

- **Use descriptive headings**: Help readers scan and navigate
- **Start with overview**: Provide context before diving into details
- **Progressive disclosure**: General concepts first, specific details later
- **Logical flow**: Organize content in the order readers need it

### Writing Style

#### Voice and Tone

- **Active voice**: "Configure the extension" instead of "The extension can be configured"
- **Present tense**: "The system validates input" instead of "The system will validate input"
- **Direct and concise**: Remove unnecessary words and phrases
- **Helpful tone**: Assume readers want to succeed and provide supportive guidance

#### Language Guidelines

- **Use simple, clear language**: Avoid jargon where possible
- **Define technical terms**: Include definitions for domain-specific terms
- **Consistent terminology**: Use the same terms throughout all documentation
- **International audience**: Avoid idioms and cultural references

#### Formatting Standards

- **Bold**: Important concepts, UI elements, file names
- **Italic**: Emphasis, first mention of key terms
- **Code blocks**: Commands, code snippets, file contents
- **Lists**: Use for steps, requirements, or related items
- **Tables**: For structured comparisons or reference data

### Code Documentation

#### JSDoc Standards

```javascript
/**
 * Saves user settings to browser storage with validation and error handling.
 *
 * @param {Object} settings - Settings object to save
 * @param {string} settings.theme - User interface theme preference
 * @param {boolean} settings.syncEnabled - Whether sync is enabled
 * @param {Object} [options={}] - Optional configuration
 * @param {boolean} [options.validate=true] - Whether to validate settings
 * @param {number} [options.retries=3] - Number of retry attempts on failure
 *
 * @returns {Promise<boolean>} True if save successful, false otherwise
 *
 * @throws {ValidationError} When settings fail validation
 * @throws {StorageError} When storage operation fails after all retries
 *
 * @example
 * // Save user theme preference
 * const success = await saveSettings({ theme: 'dark', syncEnabled: true });
 * if (!success) {
 *   console.error('Failed to save settings');
 * }
 *
 * @example
 * // Save with custom options
 * await saveSettings(
 *   { theme: 'light' },
 *   { validate: false, retries: 1 }
 * );
 */
async function saveSettings(settings, options = {}) {
  // Implementation...
}
```

#### Inline Comments

```javascript
// Complex algorithm requires explanation
function calculateOptimalSyncInterval(userActivity, networkConditions) {
  // Base interval starts at 5 minutes for active users
  let interval = userActivity.isActive ? 300000 : 900000;

  // Adjust for network conditions - slower networks need longer intervals
  const networkMultiplier = networkConditions.bandwidth < 1000 ? 1.5 : 1.0;
  interval *= networkMultiplier;

  // Cap at reasonable limits (1 minute minimum, 30 minutes maximum)
  return Math.max(60000, Math.min(interval, 1800000));
}
```

#### README Files

Each major directory should have a README.md that provides:

- Purpose and scope of the directory
- Navigation to key files
- Quick start or overview information
- Links to related documentation

## Cross-Referencing Guidelines

### Link Standards

#### Relative Path Links

Always use relative paths for internal documentation links:

```markdown
<!-- Correct: Relative paths -->

[Architecture Overview](../../architecture/01-introduction-goals.md)
[User Guide](../../user/README.md)
[Testing Guide](../workflows/testing-guide.md)

<!-- Incorrect: Absolute paths -->

[Architecture Overview](/docs/architecture/01-introduction-goals.md)
```

#### Link Descriptions

Provide meaningful link text and context:

```markdown
<!-- Good: Descriptive and contextual -->

For implementation details, see the [Building Blocks View](../../architecture/05-building-blocks.md)
which explains the component structure.

For troubleshooting deployment issues, consult the
[Deployment Troubleshooting Guide](../guides/troubleshooting.md#deployment-issues).

<!-- Poor: Generic link text -->

Click [Building Blocks View](../../architecture/05-building-blocks.md) for more information.
See [this guide](../guides/troubleshooting.md) for help.
```

#### Bidirectional Linking

Related documents should link to each other:

```markdown
<!-- In architecture document -->

For the user perspective of these architectural concepts, see
[Core Concepts](../../user/explanation/concepts.md).

<!-- In user document -->

For technical implementation details, see
[Architecture Overview](../../architecture/01-introduction-goals.md).
```

### Cross-Reference Patterns

#### Hub and Spoke Pattern

- Major sections have README files that serve as navigation hubs
- Individual documents link back to their section hub
- Hubs link to the main documentation hub

#### Layered References

- Architecture documents link to user documentation for user impact
- User documentation links to developer guides for advanced usage
- Developer guides link to architecture for system understanding

#### Contextual References

- Link to related information at the point where it's most relevant
- Provide enough context so readers understand why they should follow the link
- Use appropriate link density - not too sparse or too overwhelming

## Maintenance Procedures

### Regular Maintenance Schedule

#### Daily

- Check for broken links in new/modified documents
- Validate document templates are followed
- Review and approve documentation changes

#### Weekly

- Update project status indicators
- Review documentation metrics and usage
- Process documentation feedback and issues

#### Monthly

- Comprehensive link validation across all docs
- Review and update outdated content
- Analyze documentation usage patterns
- Update cross-reference connections

#### Quarterly

- Complete documentation structure review
- Update documentation standards based on team feedback
- Review and optimize navigation pathways
- Assess framework effectiveness and make adjustments

### Content Lifecycle

#### Creation Process

1. **Planning**
   - Identify documentation need
   - Determine appropriate framework and location
   - Check for existing content that could be updated instead

2. **Creation**
   - Use appropriate template
   - Follow writing standards
   - Include proper cross-references
   - Add to navigation structures

3. **Review**
   - Technical accuracy review by subject matter expert
   - Editorial review for clarity and consistency
   - Link validation and framework compliance check

4. **Publication**
   - Merge to main documentation
   - Update navigation and index files
   - Announce significant new documentation

#### Update Process

1. **Regular Updates**
   - Code changes trigger documentation review
   - Feature releases require documentation updates
   - Bug fixes may need troubleshooting guide updates

2. **Accuracy Maintenance**
   - Quarterly accuracy review of all documentation
   - User feedback incorporation
   - Metric-driven improvement identification

3. **Deprecation Process**
   - Mark outdated content with deprecation notices
   - Provide migration paths to current information
   - Remove deprecated content after appropriate notice period

### Quality Assurance

#### Automated Checks

```bash
# Link validation script
#!/bin/bash
echo "Checking documentation links..."

# Find broken internal links
find docs/ -name "*.md" -exec markdown-link-check {} \;

# Validate markdown syntax
markdownlint docs/

# Check for TODO or FIXME markers
grep -r "TODO\|FIXME" docs/ && echo "Found TODO/FIXME items to address"

# Verify all README files exist
for dir in docs/*/; do
    if [ ! -f "$dir/README.md" ]; then
        echo "Missing README.md in $dir"
    fi
done
```

#### Manual Quality Checks

- **Completeness**: All required sections present
- **Accuracy**: Information is current and correct
- **Clarity**: Content is understandable by target audience
- **Consistency**: Follows project standards and style
- **Navigation**: Cross-references work and add value

## Documentation Tools

### Recommended Tools

#### Markdown Editors

- **VS Code**: With markdown extensions for preview and linting
- **Typora**: WYSIWYG markdown editor
- **Mark Text**: Real-time preview markdown editor

#### Validation Tools

- **markdownlint**: Markdown syntax and style checking
- **markdown-link-check**: Automated link validation
- **Alex**: Inclusive language linting
- **Vale**: Prose linting and style guide enforcement

#### Diagram Tools

- **Mermaid**: For flowcharts, sequence diagrams, and architecture diagrams
- **PlantUML**: For UML diagrams
- **Draw.io**: For complex diagrams and mockups

### Automation Integration

#### GitHub Actions Workflow

```yaml
name: Documentation Quality Check
on:
  pull_request:
    paths:
      - "docs/**"
      - "**.md"

jobs:
  docs-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Lint Markdown
        uses: articulate/actions-markdownlint@v1
        with:
          config: .markdownlint.json
          files: "docs/**/*.md"

      - name: Check Links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: "yes"

      - name: Spell Check
        uses: streetsidesoftware/cspell-action@v2
        with:
          files: "docs/**/*.md"
```

## Common Documentation Scenarios

### Adding a New Feature

#### Documentation Requirements

1. **Architecture Impact**
   - Update building blocks view if new components added
   - Document architectural decisions made
   - Update quality requirements if performance impacted

2. **User Documentation**
   - Add how-to guide for the feature
   - Update getting started guide if core workflow changes
   - Add reference documentation for new settings/APIs
   - Create tutorial if feature is complex

3. **Developer Documentation**
   - Update development setup if new dependencies added
   - Add testing guidance for the feature
   - Update coding standards if new patterns introduced

#### Documentation Creation Order

1. Architecture decisions and component updates
2. Developer documentation for implementation team
3. User documentation for end users
4. Update all navigation and cross-references

### Bug Fix Documentation

#### When to Document Bug Fixes

- **Security fixes**: Always document in security advisories
- **Breaking changes**: Document in change logs and migration guides
- **Workflow changes**: Update relevant how-to guides
- **Recurring issues**: Add to troubleshooting guides

#### Bug Fix Documentation Process

1. Update troubleshooting guide with problem and solution
2. Add known issues to relevant user documentation
3. Update change log with fix details
4. Consider if architectural documentation needs updates

### API Changes

#### API Documentation Requirements

- Update reference documentation immediately
- Create migration guides for breaking changes
- Update code examples throughout documentation
- Test all documented examples

#### API Documentation Best Practices

- Document parameters, return values, and exceptions
- Provide working code examples
- Include common usage patterns
- Document error conditions and handling

## Contribution Workflow

### Contributing New Documentation

#### Getting Started

1. Read this guide and the [Documentation Standards](../../.documentation-standards.md)
2. Check existing documentation for similar content
3. Identify the appropriate framework and location
4. Create an issue to discuss significant new documentation

#### Writing Process

1. **Create branch**: Use descriptive branch name like `docs/add-performance-guide`
2. **Write content**: Follow templates and standards
3. **Self-review**: Check against quality criteria
4. **Add cross-references**: Link to related content appropriately

#### Submission Process

1. **Pull request**: Use PR template with documentation checklist
2. **Review process**: Technical and editorial review
3. **Address feedback**: Respond to reviewer comments
4. **Final approval**: Merge after all checks pass

### Improving Existing Documentation

#### Identifying Improvement Opportunities

- User feedback and support requests
- Documentation metrics and analytics
- Team retrospectives and feedback
- Regular content audits

#### Making Improvements

- Small fixes: Direct pull request with clear description
- Large changes: Create issue first to discuss scope
- Reorganization: Coordinate with documentation team
- Style updates: Ensure consistency across all docs

## Documentation Metrics and Success

### Key Performance Indicators

#### Usage Metrics

- Page views and popular content
- User pathways through documentation
- Search queries and results
- Support ticket reduction

#### Quality Metrics

- Time to find information
- Documentation accuracy (measured through feedback)
- Cross-reference effectiveness
- User satisfaction scores

### Continuous Improvement

#### Feedback Collection

- Documentation feedback forms
- User interviews and surveys
- Support team insights
- Developer team retrospectives

#### Improvement Process

1. **Analyze metrics**: Identify patterns and issues
2. **Prioritize improvements**: Focus on high-impact changes
3. **Implement changes**: Update content and structure
4. **Measure results**: Track improvement outcomes

## Troubleshooting Documentation Issues

### Common Problems

#### Broken Links

- **Cause**: File reorganization, renaming, or deletion
- **Solution**: Use link validation tools and automated checking
- **Prevention**: Careful planning of reorganization changes

#### Outdated Information

- **Cause**: Code changes without documentation updates
- **Solution**: Regular review cycles and change-triggered reviews
- **Prevention**: Include documentation in definition of done

#### Poor Discoverability

- **Cause**: Inadequate cross-referencing and navigation
- **Solution**: Improve hub pages and add contextual links
- **Prevention**: Regular navigation pathway reviews

#### Inconsistent Style

- **Cause**: Multiple contributors without clear standards
- **Solution**: Editorial review and style guide enforcement
- **Prevention**: Clear templates and automated style checking

### Getting Help

#### Documentation Support

- **Style and structure questions**: Consult this guide or ask documentation team
- **Technical accuracy**: Get review from subject matter experts
- **Framework selection**: Refer to decision matrix or ask for guidance
- **Tool issues**: Check tool documentation or create support ticket

## Related Documentation

### Standards and Conventions

- **[Documentation Standards](../../.documentation-standards.md)** - High-level organization principles
- **[Coding Standards](coding-standards.md)** - Code quality and documentation requirements
- **[Git Workflow](git-workflow.md)** - Branching and commit standards for documentation

### Architecture Context

- **[Architecture Overview](../../architecture/01-introduction-goals.md)** - System context for technical documentation
- **[Quality Requirements](../../architecture/10-quality-requirements.md)** - Documentation quality targets

### Process Integration

- **[Code Review Guide](../guides/code-review.md)** - Documentation review as part of code review
- **[Contributing Guidelines](../../CONTRIBUTING.md)** - Overall contribution process including documentation

## References

- [Documentation Standards](../../.documentation-standards.md) - Organization principles
- [arc42 Documentation Template](https://arc42.org/)
- [Diátaxis Documentation System](https://diataxis.fr/)
- [Technical Writing Guidelines](https://developers.google.com/tech-writing)
- [Markdown Guide](https://www.markdownguide.org/)

## Revision History

| Date       | Author             | Changes                                   |
| ---------- | ------------------ | ----------------------------------------- |
| 2025-08-11 | Documentation Team | Initial comprehensive documentation guide |
