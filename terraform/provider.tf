# ============================================================
# Provider Configuration
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # S3 Backend - เก็บ state เพื่อไม่ให้สร้าง EC2 ใหม่ทุก push
  backend "s3" {
    bucket  = "mega-automation-lab-tfstate"
    key     = "terraform.tfstate"
    region  = "ap-southeast-7"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

provider "tls" {}
