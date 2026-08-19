# ============================================================
# Ansible Playbook Resource
# ============================================================

resource "ansible_playbook" "app_deployment" {
  playbook = "${path.module}/../ansible/playbook.yml"
  name     = aws_instance.web.public_ip

  extra_vars = {
    db_host     = aws_instance.db.private_ip
    db_password = var.db_password
  }

  depends_on = [
    aws_instance.web,
    aws_instance.db
  ]
}
