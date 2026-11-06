data "ansible_inventory" "myinventory" {
  group {
    name = "tag_Role_web"
    host {
      name = aws_instance.web.public_ip
    }
  }
}
