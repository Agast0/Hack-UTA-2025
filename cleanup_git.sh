#!/bin/bash

echo "🧹 Git Repository Cleanup"
echo "========================"

# Remove untracked files that should be ignored
echo "Removing untracked files that match .gitignore patterns..."

# Remove .DS_Store files
find . -name ".DS_Store" -delete 2>/dev/null || true

# Remove .localized files  
find . -name ".localized" -delete 2>/dev/null || true

# Remove PDF files
find . -name "*.pdf" -delete 2>/dev/null || true

# Remove __pycache__ directories
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove test files (if any)
rm -f test_*.py 2>/dev/null || true
rm -f *_test.py 2>/dev/null || true

echo "✅ Cleanup completed!"
echo ""
echo "📋 Current git status:"
git status --porcelain

echo ""
echo "💡 To add all changes:"
echo "   git add ."
echo "   git commit -m 'Update .gitignore and clean up repository'"
