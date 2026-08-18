# Mega Automation Lab

🚀 **ระบบ CI/CD Pipeline อัตโนมัติ** ที่รวม Terraform + Ansible + GitHub Actions สำหรับ Deploy Web Application บน AWS

## 🏗️ Architecture

```
GitHub Push → GitHub Actions Pipeline
                ├── 🔍 Validate (Terraform fmt/validate, Ansible lint, tfsec)
                ├── 🏗️ Provision (Terraform → AWS VPC + EC2 × 2)
                ├── ⚙️ Configure (Ansible → Nginx + Node.js + PostgreSQL)
                └── 🧪 Smoke Test (curl → HTTP 200 + /health check)
```

### AWS Infrastructure
| Resource | Details |
|----------|---------|
| VPC | `10.0.0.0/16` with Internet Gateway |
| Subnet | `10.0.1.0/24` (Public, auto-assign IP) |
| Web Server | EC2 `t2.micro` — Nginx + Node.js |
| DB Server | EC2 `t2.micro` — PostgreSQL |
| Security Groups | Web: 22, 80, 3000 / DB: 22, 5432 (from Web SG only) |

## 📂 Project Structure

```
.
├── .github/workflows/
│   └── pipeline.yml          # GitHub Actions CI/CD Pipeline (หลัก)
├── .semaphore/
│   └── semaphore.yml          # Semaphore CI Pipeline (สำรอง)
├── terraform/
│   ├── provider.tf            # AWS Provider configuration
│   ├── variables.tf           # ตัวแปรทั้งหมด
│   ├── main.tf                # VPC, Subnet, SG, EC2
│   └── outputs.tf             # Output IPs & URLs
├── ansible/
│   ├── ansible.cfg            # ปิด host key checking
│   ├── inventory/
│   │   └── aws_ec2.yml        # Dynamic Inventory (ดึง IP จาก AWS)
│   ├── playbook.yml           # Main playbook
│   └── roles/
│       ├── web/               # Nginx + Node.js + Deploy App
│       │   ├── tasks/main.yml
│       │   └── handlers/main.yml
│       └── db/                # PostgreSQL
│           ├── tasks/main.yml
│           └── handlers/main.yml
└── app/
    ├── index.js               # Express.js Web Application
    └── package.json
```

## 🔑 Required GitHub Secrets

ต้องตั้งค่า Secrets ใน GitHub Repository Settings:

| Secret Name | Description |
|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `AWS_KEY_NAME` | ชื่อ Key Pair ที่สร้างไว้ใน AWS |
| `SSH_PRIVATE_KEY` | Private Key (.pem) สำหรับ SSH เข้า EC2 |

## 🚀 Quick Start

### 1. ตั้งค่า AWS Key Pair
```bash
# สร้าง Key Pair ใน AWS Console หรือ CLI
aws ec2 create-key-pair --key-name my-automation-key --query 'KeyMaterial' --output text > my-automation-key.pem
chmod 400 my-automation-key.pem
```

### 2. ตั้งค่า GitHub Secrets
ไปที่ **Repository Settings → Secrets and variables → Actions** แล้วเพิ่ม Secrets ทั้ง 4 ตัว

### 3. Push Code
```bash
git add .
git commit -m "🚀 Initial CI/CD Pipeline"
git push origin main
```

### 4. ดู Pipeline ทำงาน
ไปที่ **Actions** tab ใน GitHub Repository จะเห็น Pipeline ทำงานอัตโนมัติ!

## 🧹 Cleanup (ลบ Infrastructure)

```bash
cd terraform
terraform destroy -auto-approve
```
