# ============================================================
# Ansible Data Source & Action Configuration
# ============================================================

# 1. Dynamic Inventory Data Source จาก Terraform State
data "ansible_inventory" "myinventory" {
  group {
    name = "tag_Role_web"

    host {
      name = aws_instance.web.public_ip
    }
  }

  group {
    name = "tag_Role_db"

    host {
      name = aws_instance.db.public_ip
    }
  }
}

# 2. Action สั่งรัน Playbook โดยใช้ Inventory JSON จาก Data Source
action "ansible_playbook_run" "with_inventories" {
  config {
    playbooks   = ["${path.module}/../ansible/playbook.yml"]
    inventories = [data.ansible_inventory.myinventory.json]

    extra_vars = {
      db_host     = aws_instance.db.private_ip
      db_password = var.db_password
    }
  }
}

# 3. Action สั่งรัน Playbook โดยใช้ Inventory Files (ทางเลือก)
action "ansible_playbook_run" "with_inventory_files" {
  config {
    playbooks       = ["${path.module}/../ansible/playbook.yml"]
    inventory_files = ["${path.module}/../ansible/inventory/aws_ec2.yml"]

    extra_vars = {
      db_host     = aws_instance.db.private_ip
      db_password = var.db_password
    }
  }
}
