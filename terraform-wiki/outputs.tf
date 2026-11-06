output "web_server_public_ip" {
  value = aws_instance.web.public_ip
}

output "web_url" {
  value = "http://${aws_instance.web.public_ip}"
}

output "private_key_pem" {
  value     = tls_private_key.ssh_key.private_key_openssh
  sensitive = true
}

output "ansible_inventory_json" {
  value     = data.ansible_inventory.myinventory.json
  sensitive = true
}

output "ansible_playbook_path" {
  value = "${path.module}/../ansible/playbook.yml"
}

output "ansible_extra_vars" {
  value = {}
}
