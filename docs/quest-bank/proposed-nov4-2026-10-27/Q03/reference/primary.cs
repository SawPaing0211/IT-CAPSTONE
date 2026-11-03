using System;
public class Solution {
 public static void Run() {
  string[] tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);
  long[] v=Array.ConvertAll(tokens,long.Parse);
  long sum=0; for(long i=2;i<=v[0];i+=2) sum+=i; Console.WriteLine(sum);
 }
}
