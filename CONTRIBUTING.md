# Contributing to IPO Bulk Applier 🤝

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- No harassment, discrimination, or hate speech
- Help others learn and grow
- Report issues through GitHub Issues

## Getting Started

### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/yourusername/ipo-bulk-applier.git
cd ipo-bulk-applier

# Add upstream remote
git remote add upstream https://github.com/original-owner/ipo-bulk-applier.git
```

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
# or
git checkout -b docs/improvement
```

### 3. Install Development Dependencies

```bash
npm install
npm start
```

## Making Changes

### Code Style

- Use ES6+ features
- Consistent indentation (2 spaces)
- Descriptive variable names
- Comment complex logic
- Use `console.log()` for debugging, remove before commit

### File Organization

```
├── automation.js      # Core Puppeteer automation
├── server.js          # Express backend
├── public/
│   ├── index.html     # Frontend interface
│   ├── app.js         # Frontend logic
│   └── style.css      # Styling
```

### Key Components to Modify

**automation.js**: Core automation logic
```javascript
// Main function to modify
export async function startBulkApplication(selectedAccounts, quantity, onProgress)

// Individual IPO application
async function applyIPOForAccount(browser, account, quantity, ...)
```

**server.js**: Express endpoints
```javascript
// Add new routes here
app.post('/api/your-endpoint', (req, res) => { ... })
```

**public/app.js**: Frontend logic
```javascript
// API calls and DOM manipulation
async function saveAccount() { ... }
```

## Testing

### Manual Testing

1. Add test account with your credentials
2. Try bulk application
3. Check results for accuracy
4. Test error scenarios

### Areas to Test

- [ ] Account creation/edit/delete
- [ ] Bulk application with 1 account
- [ ] Bulk application with multiple accounts
- [ ] PIN retry logic
- [ ] Error handling
- [ ] Button state verification

## Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "feat: add PIN retry logic with automatic fallback"
git commit -m "fix: CRN extraction from account number"
git commit -m "docs: add deployment guide for Vercel"

# Bad
git commit -m "fix stuff"
git commit -m "update"
```

### Format

```
<type>: <subject>
<blank line>
<body (optional)>

Types: feat, fix, docs, style, refactor, perf, test, chore
```

## Pull Request Process

### 1. Sync with Upstream

```bash
git fetch upstream
git rebase upstream/main
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

- Go to GitHub
- Click "New Pull Request"
- Set base to `main` branch
- Fill in PR description

### PR Template

```markdown
## Description
Brief description of changes

## Related Issues
Closes #(issue number)

## Changes
- Change 1
- Change 2

## Testing
- [ ] Tested locally
- [ ] Checked error scenarios
- [ ] Verified UI/UX

## Screenshots (if applicable)
<!-- Add screenshots here -->
```

## Areas for Contribution

### 🐛 Bug Fixes
- Check [Issues](https://github.com/yourusername/ipo-bulk-applier/issues)
- Label: `bug`
- Fix and create PR

### 📚 Documentation
- README improvements
- API documentation
- Troubleshooting guides
- User guides
- Comments in code

### ✨ Features
- Discuss in Issues first
- Label: `enhancement`
- Propose implementation
- Get feedback before coding

### 🎨 UI/UX
- Improve interface design
- Better error messages
- Responsive improvements
- Accessibility features

### 🚀 Performance
- Optimize slow operations
- Reduce memory usage
- Improve load times
- Better error handling

### 🧪 Testing
- Add test cases
- Improve test coverage
- Automate testing

## Common Issues & Solutions

### Issue: Website selectors changed
**Solution**: Update selectors in `automation.js`
- Use browser DevTools to inspect elements
- Test selector before committing
- Add comment explaining why selector is used

### Issue: New form fields on Mero Share
**Solution**: Extend `automation.js` to handle
- Check for new fields
- Add appropriate handling
- Test with actual website

### Issue: PIN verification failing
**Solution**: Check PIN retry logic in `automation.js`
- Verify error message detection
- Test both PINs
- Check success verification

## Release Process

When ready to release:

1. Update version in `package.json`
2. Create release notes
3. Tag commit: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Create GitHub Release

## Questions?

- Check existing [Issues](https://github.com/yourusername/ipo-bulk-applier/issues)
- Check [Discussions](https://github.com/yourusername/ipo-bulk-applier/discussions)
- Open new Issue with `question` label
- Comment on related Issues

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

---

**Thank you for contributing!** 🎉

Together we're making IPO application automation better for everyone.
