terraform {
  backend "s3" {
    bucket = "terraform-vcfvct2"
    key    = "web.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}


resource "aws_vpc" "main" {
  cidr_block = "172.30.0.0/16"
}

resource "aws_subnet" "main" {
  vpc_id                  = "${aws_vpc.main.id}"
  cidr_block              = "172.30.0.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "Main"
  }
}

resource "aws_security_group" "server" {
  vpc_id      = "${aws_vpc.main.id}"
  name        = "server"
  description = "Security Group for server"

  tags = {
    Name           = "server_SG"
    Terraform_Name = "server_SG"
  }
}

resource "aws_security_group_rule" "http" {
  security_group_id = "${aws_security_group.server.id}"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  protocol          = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_security_group_rule" "https" {
  security_group_id = "${aws_security_group.server.id}"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_security_group_rule" "ssh" {
  security_group_id = "${aws_security_group.server.id}"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  protocol          = "tcp"
  from_port         = 22
  to_port           = 22
}

resource "aws_security_group_rule" "outbound" {
  security_group_id = "${aws_security_group.server.id}"
  type              = "egress"
  cidr_blocks       = ["0.0.0.0/0"]
  protocol          = "-1"
  from_port         = 0
  to_port           = 0
}


resource "aws_internet_gateway" "gw" {
  vpc_id = "${aws_vpc.main.id}"

  tags = {
    Name = "main"
  }
}

resource "aws_route_table" "r" {
  vpc_id = "${aws_vpc.main.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.gw.id}"
  }

  tags = {
    Name = "main"
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = "${aws_subnet.main.id}"
  route_table_id = "${aws_route_table.r.id}"
}

resource "aws_key_pair" "han-pub" {
  key_name   = "han-pub"
  public_key = "${file("han.pub")}"
}

resource "aws_instance" "web" {
  ami                    = "${var.amiId}"
  instance_type          = "t2.micro"
  vpc_security_group_ids = ["${aws_security_group.server.id}"]
  subnet_id              = "${aws_subnet.main.id}"
  key_name               = "${aws_key_pair.han-pub.key_name}"
  user_data              = "${file("init.sh")}"
  tags = {
    Name = "cccgWeb"
  }
}

resource "aws_eip" "main" {
  vpc = true
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = "${aws_instance.web.id}"
  allocation_id = "${aws_eip.main.id}"
}
