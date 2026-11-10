using System;
public class Solution {
 public static void Run() {
  string[] tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);
  long[] v=Array.ConvertAll(tokens,long.Parse);
  long n=Math.Abs(v[0]),sum=0; while(n>0){sum+=n%10;n/=10;} Console.WriteLine(sum);
 }
}
