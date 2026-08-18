# ============================================================
# Data Sources - ดึงค่า AMI อัตโนมัติใน Region นั้นๆ
# ============================================================

# ============================================================
# Locals - ตรวจสอบ architecture ตาม instance type
# ============================================================

locals {
  # t4g = Graviton ARM64, อื่นๆ = amd64 (x86_64)
  is_graviton = startswith(var.instance_type, "t4g") || startswith(var.instance_type, "m6g") || startswith(var.instance_type, "c6g")
  arch        = local.is_graviton ? "arm64" : "x86_64"
  ami_name    = local.is_graviton ? "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*" : "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical (Ubuntu)

  filter {
    name   = "name"
    values = [local.ami_name]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = [local.arch]
  }
}

# ============================================================
# VPC & Networking
# ============================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name    = "${var.project_name}-vpc"
    Project = var.project_name
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name    = "${var.project_name}-igw"
    Project = var.project_name
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name    = "${var.project_name}-public-subnet"
    Project = var.project_name
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name    = "${var.project_name}-public-rt"
    Project = var.project_name
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ============================================================
# Security Groups
# ============================================================

resource "aws_security_group" "web_sg" {
  name        = "${var.project_name}-web-sg"
  description = "Security Group for Web Server - Allow HTTP and SSH"
  vpc_id      = aws_vpc.main.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Node.js App (port 3000) - ใช้สำหรับ Nginx reverse proxy
  ingress {
    description = "Node.js App"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-web-sg"
    Project = var.project_name
  }
}

resource "aws_security_group" "db_sg" {
  name        = "${var.project_name}-db-sg"
  description = "Security Group for DB Server - Allow PostgreSQL from Web SG and SSH"
  vpc_id      = aws_vpc.main.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL - อนุญาตเฉพาะจาก Web Security Group เท่านั้น
  ingress {
    description     = "PostgreSQL from Web Server"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-db-sg"
    Project = var.project_name
  }
}

# ============================================================
# EC2 Instances
# ============================================================

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  key_name               = var.key_name

  credit_specification {
    cpu_credits = "standard"
  }

  # ใส่ Tag ให้ Ansible ใช้ Dynamic Inventory ดึงไปใช้งาน
  tags = {
    Name    = "WebServer"
    Role    = "web"
    Project = var.project_name
  }
}

resource "aws_instance" "db" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  key_name               = var.key_name

  credit_specification {
    cpu_credits = "standard"
  }

  # ใส่ Tag ให้ Ansible ใช้ Dynamic Inventory ดึงไปใช้งาน
  tags = {
    Name    = "DBServer"
    Role    = "db"
    Project = var.project_name
  }
}
