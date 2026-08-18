# ============================================================
# Provider Configuration
# ============================================================
# กำหนดให้ Terraform ใช้ AWS Provider และ Region จากตัวแปร

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
