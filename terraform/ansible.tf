# ============================================================
# Ansible Action Configuration (Terraform Action)
# ============================================================

action "ansible_playbook_run" "ansible" {
  config {
    playbooks = ["${path.module}/../ansible/playbook.yml"]

    inventories = [
      jsonencode({
        tag_Role_web = {
          hosts = [aws_instance.web.public_ip]
          vars = {
            ansible_user                 = "ubuntu"
            ansible_ssh_private_key_file = "/tmp/id_rsa"
            ansible_ssh_common_args      = "-o StrictHostKeyChecking=no"
          }
        }
        tag_Role_db = {
          hosts = [aws_instance.db.public_ip]
          vars = {
            ansible_user                 = "ubuntu"
            ansible_ssh_private_key_file = "/tmp/id_rsa"
            ansible_ssh_common_args      = "-o StrictHostKeyChecking=no"
          }
        }
      })
    ]

    extra_vars = {
      db_host     = aws_instance.db.private_ip
      db_password = var.db_password
    }
  }
}
