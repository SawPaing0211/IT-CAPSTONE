import sys
values=list(map(int,sys.stdin.read().split()))
best=values[0]
for x in values[1:]:
 if x>best: best=x
print(best)
