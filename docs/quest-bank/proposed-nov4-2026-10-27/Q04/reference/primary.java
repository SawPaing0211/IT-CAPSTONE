import java.util.*;
public class Solution {
 public static void main(String[] args) {
  Scanner sc=new Scanner(System.in); ArrayList<Long> list=new ArrayList<>();
  while(sc.hasNextLong()) list.add(sc.nextLong());
  long[] v=new long[list.size()]; for(int i=0;i<v.length;i++) v[i]=list.get(i);
  long n=Math.abs(v[0]),sum=0; while(n>0){sum+=n%10;n/=10;} System.out.println(sum);
 }
}
