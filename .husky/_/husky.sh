mkdir -p .husky/_
cat << 'EOF' > .husky/_/husky.sh
#!/bin/sh
# shellcheck disable=SC1090
. "$(git rev-parse --show-toplevel)/node_modules/husky/husky.sh"
EOF

chmod +x .husky/_/husky.sh
