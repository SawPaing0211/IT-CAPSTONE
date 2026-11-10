import sys
v=list(map(int,sys.stdin.read().split()))
n=v[0]; print(sum(map(int,str(n))) if n>=0 else 0)
