variable "amiId" {
  description = "ami to use"
  type = "string"
  default = "ami-07d0cf3af28718ef8"
}

variable "stateBucket" {
  description = "the bucket to store tf state"
  type = "string"
}



