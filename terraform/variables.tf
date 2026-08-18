# ============================================================
# Variables
# ============================================================

variable "aws_region" {
  description = "AWS Region ที่จะสร้าง Infrastructure"
  type        = string
  default     = "ap-southeast-1" # Singapore (ใกล้ไทยที่สุด)
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
  default     = "t2.micro"
}

variable "key_name" {
  description = "ชื่อ AWS Key Pair สำหรับ SSH เข้า EC2"
  type        = string
  default     = "my-automation-key"
}

variable "ami_id" {
  description = "AMI ID สำหรับ Ubuntu 22.04 LTS (ap-southeast-1)"
  type        = string
  default     = "ami-078c1149d8ad719a7" # Ubuntu 22.04 LTS ap-southeast-1
}

variable "project_name" {
  description = "ชื่อ Project สำหรับ tagging resources"
  type        = string
  default     = "mega-automation-lab"
}
