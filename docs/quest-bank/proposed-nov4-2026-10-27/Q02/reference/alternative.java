import java.util.*;
public class Solution {
 public static void main(String[] args) {
  Scanner sc=new Scanner(System.in); ArrayList<Long> list=new ArrayList<>();
  while(sc.hasNextLong()) list.add(sc.nextLong());
  long[] v=new long[list.size()]; for(int i=0;i<v.length;i++) v[i]=list.get(i);
  long best=v[0]; for(int i=1;i<3;i++) if(v[i]>best) best=v[i]; System.out.println(best);
 }
}
