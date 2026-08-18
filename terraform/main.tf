# ============================================================
# Data Sources - ดึงค่า AMI อัตโนมัติใน Region นั้นๆ
# ============================================================

# ============================================================
# Locals - ตรวจสอบ architecture ตาม instance type
# ============================================================

locals {
  # t4g/m6g/c6g = Graviton ARM64, others = amd64
  is_graviton  = startswith(var.instance_type, "t4g") || startswith(var.instance_type, "m6g") || startswith(var.instance_type, "c6g")
  arch         = local.is_graviton ? "arm64" : "amd64"
  ssm_ami_path = "/aws/service/canonical/ubuntu/server/22.04/stable/current/${local.arch}/hvm/ebs-gp2/ami-id"
}

data "aws_ssm_parameter" "ubuntu" {
  name = local.ssm_ami_path
}

# ============================================================
# SSH Key Pair - สร้าง Key อัตโนมัติ ไม่ต้องอัปโหลด manual
# ============================================================

resource "tls_private_key" "ssh_key" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "deployer" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.ssh_key.public_key_openssh

  tags = {
    Name    = "${var.project_name}-key"
    Project = var.project_name
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
  ami                    = data.aws_ssm_parameter.ubuntu.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  key_name               = aws_key_pair.deployer.key_name

  # t4g.micro ใช้ unlimited by default, standard ต้องระบุเฉพาะ non-Graviton เท่านั้น
  dynamic "credit_specification" {
    for_each = local.is_graviton ? [] : [1]
    content {
      cpu_credits = "standard"
    }
  }

  # ใส่ Tag ให้ Ansible ใช้ Dynamic Inventory ดึงไปใช้งาน
  tags = {
    Name    = "WebServer"
    Role    = "web"
    Project = var.project_name
  }
}

resource "aws_instance" "db" {
  ami                    = data.aws_ssm_parameter.ubuntu.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  key_name               = aws_key_pair.deployer.key_name

  dynamic "credit_specification" {
    for_each = local.is_graviton ? [] : [1]
    content {
      cpu_credits = "standard"
    }
  }

  # ใส่ Tag ให้ Ansible ใช้ Dynamic Inventory ดึงไปใช้งาน
  tags = {
    Name    = "DBServer"
    Role    = "db"
    Project = var.project_name
  }
}
