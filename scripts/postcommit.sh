#!/bin/bash
# Check for unstaged changes and commit them
if [[ -n $(git status --porcelain) ]]; then
  echo "Detected changes after Prettier format. Creating follow-up commit..."
  git add .
  git commit -m "chore: format code with Prettier"
fi
