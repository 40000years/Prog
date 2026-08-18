# ============================================================
# Outputs - ส่งค่า IP ออกมาให้ใช้งาน
# ============================================================

output "vpc_id" {
  description = "ID ของ VPC ที่สร้างขึ้น"
  value       = aws_vpc.main.id
}

output "web_server_public_ip" {
  description = "Public IP ของ Web Server"
  value       = aws_instance.web.public_ip
}

output "web_server_private_ip" {
  description = "Private IP ของ Web Server"
  value       = aws_instance.web.private_ip
}

output "db_server_public_ip" {
  description = "Public IP ของ DB Server (ใช้ SSH เข้าไป manage)"
  value       = aws_instance.db.public_ip
}

output "db_server_private_ip" {
  description = "Private IP ของ DB Server (ให้ Web Server เชื่อมต่อ)"
  value       = aws_instance.db.private_ip
}

output "web_url" {
  description = "URL สำหรับเข้าถึง Web Application"
  value       = "http://${aws_instance.web.public_ip}"
}
