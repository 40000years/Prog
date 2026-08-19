# ============================================================
# Ansible Provider Integration
# ============================================================
# สั่งรัน Ansible Playbook อัตโนมัติผ่าน Terraform

resource "ansible_host" "web_server" {
  name   = aws_instance.web.public_ip
  groups = ["tag_Role_web"]

  variables = {
    ansible_user                 = "ubuntu"
    ansible_ssh_private_key_file = "/tmp/id_rsa"
    ansible_ssh_common_args      = "-o StrictHostKeyChecking=no"
    role                         = "web"
  }
}

resource "ansible_host" "db_server" {
  name   = aws_instance.db.public_ip
  groups = ["tag_Role_db"]

  variables = {
    ansible_user                 = "ubuntu"
    ansible_ssh_private_key_file = "/tmp/id_rsa"
    ansible_ssh_common_args      = "-o StrictHostKeyChecking=no"
    role                         = "db"
  }
}

resource "ansible_playbook" "app_deployment" {
  playbook = "${path.module}/../ansible/playbook.yml"
  name     = aws_instance.web.public_ip

  extra_vars = {
    db_host     = aws_instance.db.private_ip
    db_password = var.db_password
  }

  depends_on = [
    aws_instance.web,
    aws_instance.db,
    ansible_host.web_server,
    ansible_host.db_server
  ]
}
