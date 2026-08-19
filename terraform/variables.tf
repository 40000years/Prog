# ============================================================
# Variables
# ============================================================

variable "aws_region" {
  description = "AWS Region ที่จะสร้าง Infrastructure"
  type        = string
  default     = "ap-southeast-7" # Thailand
}

variable "vpc_cidr" {
  description = "CIDR Block สำหรับ VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR Block สำหรับ Public Subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type" {
  description = "ประเภท EC2 Instance"
  type        = string
  default     = "t4g.micro" # Graviton2 ARM - Free Tier eligible in ap-southeast-7
}

variable "key_name" {
  description = "ชื่อ AWS Key Pair สำหรับ SSH เข้า EC2"
  type        = string
  default     = "my-automation-key"
}

variable "project_name" {
  description = "ชื่อ Project สำหรับ tagging resources"
  type        = string
  default     = "mega-automation-lab"
}

variable "db_password" {
  description = "Database user password for PostgreSQL"
  type        = string
  default     = "SuperSecretPass123!"
  sensitive   = true
}
