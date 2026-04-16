#!/bin/bash

################################################################################
# SmartRentDZ Environment Setup Script
# Production deployment on Ubuntu/Debian Linux
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="smartrentdz"
PROJECT_USER="smartrentdz"
PROJECT_GROUP="smartrentdz"
PROJECT_HOME="/opt/smartrentdz"
PYTHON_VERSION="3.9"
VENV_PATH="${PROJECT_HOME}/venv"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}SmartRentDZ Environment Setup${NC}"
echo -e "${GREEN}================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Update system packages
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install system dependencies
echo -e "${YELLOW}[2/8] Installing system dependencies...${NC}"
apt-get install -y \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-venv \
    python${PYTHON_VERSION}-dev \
    python3-pip \
    build-essential \
    libssl-dev \
    libffi-dev \
    git \
    curl \
    wget \
    nginx \
    supervisor \
    postgresql \
    postgresql-contrib

# Create project user
echo -e "${YELLOW}[3/8] Creating project user...${NC}"
if ! id "${PROJECT_USER}" &>/dev/null; then
    useradd -r -s /bin/bash -d "${PROJECT_HOME}" -m "${PROJECT_USER}"
    echo -e "${GREEN}User ${PROJECT_USER} created${NC}"
else
    echo -e "${GREEN}User ${PROJECT_USER} already exists${NC}"
fi

# Create project directories
echo -e "${YELLOW}[4/8] Creating project directories...${NC}"
mkdir -p "${PROJECT_HOME}"
mkdir -p "${PROJECT_HOME}/logs"
mkdir -p "${PROJECT_HOME}/models"
mkdir -p /var/log/smartrentdz
mkdir -p /var/run/smartrentdz

chown -R "${PROJECT_USER}:${PROJECT_GROUP}" "${PROJECT_HOME}"
chown -R "${PROJECT_USER}:${PROJECT_GROUP}" /var/log/smartrentdz
chown -R "${PROJECT_USER}:${PROJECT_GROUP}" /var/run/smartrentdz

chmod 755 "${PROJECT_HOME}"
chmod 755 /var/log/smartrentdz
chmod 755 /var/run/smartrentdz

# Create Python virtual environment
echo -e "${YELLOW}[5/8] Creating Python virtual environment...${NC}"
python${PYTHON_VERSION} -m venv "${VENV_PATH}"
chown -R "${PROJECT_USER}:${PROJECT_GROUP}" "${VENV_PATH}"

# Install Python dependencies
echo -e "${YELLOW}[6/8] Installing Python dependencies...${NC}"
source "${VENV_PATH}/bin/activate"
pip install --upgrade pip setuptools wheel
pip install -r "${PROJECT_HOME}/requirements.txt"

# Configure Nginx
echo -e "${YELLOW}[7/8] Configuring Nginx...${NC}"
cp "${PROJECT_HOME}/config/nginx.conf" /etc/nginx/sites-available/smartrentdz
ln -sf /etc/nginx/sites-available/smartrentdz /etc/nginx/sites-enabled/smartrentdz
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Install and enable Systemd service
echo -e "${YELLOW}[8/8] Installing Systemd service...${NC}"
cp "${PROJECT_HOME}/config/smartrentdz.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable smartrentdz.service

# Create logrotate configuration
cat > /etc/logrotate.d/smartrentdz << EOF
/var/log/smartrentdz/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ${PROJECT_USER} ${PROJECT_GROUP}
    sharedscripts
    postrotate
        systemctl reload smartrentdz > /dev/null 2>&1 || true
    endscript
}
EOF

# Print completion message
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy your data file: cp airbnb_algeria_data.json ${PROJECT_HOME}/"
echo "2. Train the model: cd ${PROJECT_HOME} && source venv/bin/activate && python scripts/train_model.py"
echo "3. Start the service: systemctl start smartrentdz"
echo "4. Check status: systemctl status smartrentdz"
echo "5. View logs: journalctl -u smartrentdz -f"
echo ""
echo -e "${YELLOW}API will be available at:${NC}"
echo "  - Local: http://localhost:8000"
echo "  - Nginx proxy: http://api.smartrentdz.com"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  - Swagger UI: http://api.smartrentdz.com/docs"
echo "  - ReDoc: http://api.smartrentdz.com/redoc"
echo ""
