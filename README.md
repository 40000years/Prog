# Evergarden Wiki บน EC2

โปรเจกต์นี้สร้าง EC2 ด้วย Terraform และใช้ Ansible ติดตั้ง Nginx เพื่อให้บริการ Evergarden Wiki แบบ static ที่ path `/evergardenwiki/` โดยไม่ต้องใช้ backend สำหรับ wiki

## พัฒนาและ build

ต้องใช้ Node.js 24 และ npm:

```sh
cd app
npm ci
npm run dev
```

สร้างไฟล์สำหรับ deploy และตรวจชนิดข้อมูล:

```sh
npm run typecheck
SITE_STATIC_EXPORT=1 npm run build
```

ไฟล์ที่ deploy อยู่ใน `app/out/` ซึ่งไม่ได้เก็บใน Git แก้เนื้อหาที่ `app/content/` และ frontend ที่ `app/src/` จากนั้น build ใหม่

## Deploy

GitHub Actions ใช้ `terraform-wiki/` สำหรับ AWS account `858039354188` โดยมี EC2 เว็บหนึ่งเครื่องและ state bucket แยกจากระบบเดิม ตัว pipeline ตรวจ account ID ก่อน deploy และต้องตั้ง GitHub Secrets ของบัญชีเป้าหมายให้ถูกต้อง GitHub Actions จะ build และตรวจ wiki เมื่อมีการแก้ไข จากนั้นเมื่อ push ไป `main` หรือ `master` จะ build อีกครั้งใน job deploy, รัน Terraform และ Ansible แล้วตรวจหน้าแรกกับหน้าคู่มือ AWS credentials และ SSH key ยังคงใช้ GitHub Secrets เดิม การรัน Ansible ด้วยตัวเองต้อง build `app/out/` ก่อนและมี rsync บนเครื่องที่รัน Ansible

Ansible จะส่งไฟล์ไป `/var/www/evergarden` ตั้ง Nginx ให้ serve ไฟล์ และหยุด/ปิด service `myapp` เดิม ไฟล์ที่ไม่มีใน build ใหม่จะถูกลบจากไดเรกทอรี wiki ระหว่าง deploy

ไดเรกทอรี `terraform/` เป็นระบบเก่า ส่วน Semaphore pipeline ใช้ตรวจโค้ดเท่านั้นและไม่ deploy ทรัพยากรในบัญชีเดิมยังคงอยู่และอาจมีค่าใช้จ่าย ควรตรวจ `terraform plan` ก่อนดำเนินการ

## ค่าใช้จ่าย EC2

ค่าเริ่มต้นคือ `t4g.micro` ซึ่งอยู่ในรายการ Free Tier eligible ของ AWS และใช้ CPU credit แบบ standard สำหรับ web เพื่อหลีกเลี่ยงค่า surplus credit หาก CPU credit หมด เครื่องอาจตอบสนองช้าลง ค่าใช้จ่ายอื่น เช่น EBS และ public IPv4 ยังอาจเกิดขึ้น ตรวจสอบ AWS Billing ตาม account และ region ที่ใช้งานจริง

การปรับ Free plan เป็น Paid plan เป็นการตัดสินใจใน AWS Console ของเจ้าของบัญชี และอาจทำให้เกิดค่าใช้จ่ายจริงเมื่อเครดิตหมด หมดอายุ หรือไม่ครอบคลุมบริการ ตรวจวันหมดอายุเครดิตแต่ละรายการก่อนตัดสินใจ
