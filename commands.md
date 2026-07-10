sudo mn --topo linear,3 --controller=remote, ip=192.168.56.1, port=6653 --switch ovsk, protocols=OpenFlow13
curl -u admin:admin http://127.0.0.1:8181/rests/data/opendaylight-inventory:nodes
