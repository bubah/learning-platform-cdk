#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

# === 1. Install Java 17 ===
amazon-linux-extras enable corretto8
yum install -y java-17-amazon-corretto

# === 2. Install NGINX ===
amazon-linux-extras enable nginx1
echo "=== Installing nginx ==="
yum clean metadata
yum install -y nginx

# === 3. Starting NGINX ===
systemctl enable nginx
systemctl start nginx

# === 4. Configure NGINX Reverse Proxy ===
echo "=== Configuring NGINX for Spring Boot ==="
tee /etc/nginx/conf.d/springboot.conf > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

nginx -t && service nginx reload

# # === 4. Set Environment Variables ===
# ENV_PATH="/lp/${ENV}/"
# echo "Fetching SSM parameters from path: ${ENV_PATH}"

# PARAMS=$(aws ssm get-parameters-by-path --path "$ENV_PATH" --recursive --with-decryption --region $REGION)

# # Parse each parameter and export it
# echo "$PARAMS" | jq -r '.Parameters[] | "\(.Name)=\(.Value)"' | while IFS='=' read -r full_name value; do
#   # Strip the path prefix to get just the variable name
#   var_name=$(basename "$full_name")
#   echo "export $var_name=\"$value\"" >> /etc/profile.d/springboot_env.sh
# done

# # === 5. Download App JAR from S3 ===
# mkdir -p /opt/myapp
# aws s3 cp s3://contehtech-learning-platform-artifacts/learning-platform/${ENV}/1.0.0/learning-platform-0.0.1-SNAPSHOT.jar /opt/myapp/app.jar

# # === 6. Create systemd service ===
# cat > /etc/systemd/system/springboot-app.service <<EOF
# [Unit]
# Description=Spring Boot Application
# After=network.target

# [Service]
# User=root
# EnvironmentFile=-/etc/profile.d/springboot_env.sh
# ExecStart=/usr/bin/java -jar /opt/myapp/app.jar
# Restart=always
# RestartSec=5
# StandardOutput=syslog
# StandardError=syslog
# SyslogIdentifier=springboot-app

# [Install]
# WantedBy=multi-user.target
# EOF

# # === 7. Start & Enable the service ===
# systemctl daemon-reexec
# systemctl daemon-reload
# systemctl enable springboot-app
# systemctl start springboot-app
# systemctl is-active springboot-app && echo "Springboot app is running" || echo "Springboot app is NOT running"
