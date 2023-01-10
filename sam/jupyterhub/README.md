# deploy JupyterHub to EKS

## create cluster
* `eksctl create cluster --name han-cluster --region us-east-1 --node-type t3.medium`

### config
* eks info at `~/.kube/config`
* get service `kubectl get svc`
* get pods `kubectl get pods -A -o wide`
* get nodes `kubectl get nodes -o wide`

## helm
```
helm repo add jupyterhub https://jupyterhub.github.io/helm-chart/
helm repo update
```

* use `helm repo list` to see available repos.
* use `helm search repo jupyterhub` to see different jupyterhub chart versions.

### installation
* download the chart parameters: `helm show values jupyterhub/jupyterhub > jupyterhub.yaml` and tweak.
* install with: 
```
helm upgrade --cleanup-on-fail \
  --install sam-jh-eks jupyterhub/jupyterhub \
  --namespace sam-jh \
  --create-namespace \
  --version=2.0.0 \
  --values jupyterhub.yaml
```

### Post-installation checklist
* set default namespace `kubectl config set-context $(kubectl config current-context) --namespace sam-jh`

  - Verify that created Pods enter a Running state:

      kubectl --namespace=sam-jh get pod

    If a pod is stuck with a Pending or ContainerCreating status, diagnose with:

      kubectl --namespace=sam-jh describe pod <name of pod>

    If a pod keeps restarting, diagnose with:

      kubectl --namespace=sam-jh logs --previous <name of pod>

  - Verify an external IP is provided for the k8s Service proxy-public.

      kubectl --namespace=sam-jh get service proxy-public

    If the external ip remains <pending>, diagnose with:

      kubectl --namespace=sam-jh describe service proxy-public

  - Verify web based access:

    You have not configured a k8s Ingress resource so you need to access the k8s
    Service proxy-public directly.

    If your computer is outside the k8s cluster, you can port-forward traffic to
    the k8s Service proxy-public with kubectl to access it from your
    computer.

      kubectl --namespace=sam-jh port-forward service/proxy-public 8080:http

    Try insecure HTTP access: http://localhost:8080
