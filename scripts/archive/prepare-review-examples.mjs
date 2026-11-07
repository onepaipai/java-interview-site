import {readFile,writeFile,mkdir} from 'node:fs/promises';
const pack=JSON.parse(await readFile(new URL('../../content/explanations/question-overrides.json',import.meta.url),'utf8'));
const code=key=>pack.questions[key].case.find(step=>step.code?.language==='java').code.source;
const copy=code('java-language/5').split('// 方法体中：');
const scenarios=[['collections/25',['false','true','7','0','false']],['java-language/3',['false','true']],['collections/21',['1','[1, 2]']],['collections/38',['2 / 1']],
 ['collections/6',['[A, C]']],['collections/7',['20','[10, 20]','[20, 30]']],['collections/15',['2000']],
 ['collections/18',['null-key rejected','null-value rejected','null','true / true']],['collections/19',['2']],['collections/41',['[B, A]','[A, B]']]];
const source=`import java.util.*;
import java.util.concurrent.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
public class ReviewExamples20261020 {
  interface Work { void run() throws Exception; }
  static void check(String name, Work work, List<String> expected) throws Exception {
    var original=System.out; var bytes=new ByteArrayOutputStream();
    try(var capture=new PrintStream(bytes,true,StandardCharsets.UTF_8)) {
      System.setOut(capture); work.run();
    } finally { System.setOut(original); }
    var actual=bytes.toString(StandardCharsets.UTF_8).lines().toList();
    if(!actual.equals(expected))throw new AssertionError(name+": "+actual+" != "+expected);
    System.out.println("PASS "+name+" "+actual);
  }
  ${copy[0]}
  static class Publication { ${code('concurrency-advanced/12')} }
  public static void main(String[] args) throws Exception {
    ${scenarios.map(([key,expected])=>`check(${JSON.stringify(key)},()->{\n${code(key)}\n},List.of(${expected.map(s=>JSON.stringify(s)).join(',')}));`).join('\n')}
    check("PECS",()->{\n${copy[1]}\nSystem.out.println(to);},List.of("[1, 2]"));
    for(int n=0;n<100;n++) {
      var state=new Publication();var result=new java.util.concurrent.atomic.AtomicInteger(-1);
      var reader=new Thread(()->result.set(state.read()));reader.setDaemon(true);reader.start();
      state.publish();reader.join(2000);
      if(reader.isAlive()||result.get()!=42)throw new AssertionError("volatile publication");
    }
    System.out.println("PASS volatile publication: 100 runs");
    var counter=new HashMap<String,Integer>();counter.put("count",0);var gate=new CyclicBarrier(2);
    Runnable unsafe=()->{int old=counter.get("count");try{gate.await(2,TimeUnit.SECONDS);}catch(Exception e){throw new RuntimeException(e);}counter.put("count",old+1);};
    var first=new Thread(unsafe);var second=new Thread(unsafe);first.setDaemon(true);second.setDaemon(true);first.start();second.start();first.join(3000);second.join(3000);
    if(first.isAlive()||second.isAlive()||counter.get("count")!=1)throw new AssertionError("lost update schedule");
    var safe=new ConcurrentHashMap<String,Integer>();Runnable update=()->safe.merge("count",1,Integer::sum);
    first=new Thread(update);second=new Thread(update);first.start();second.start();first.join(3000);second.join(3000);
    if(safe.get("count")!=2)throw new AssertionError("atomic merge");
    System.out.println("PASS controlled lost update=1 / atomic merge=2");
    var interrupted=new SynchronousQueue<Integer>();Thread.currentThread().interrupt();
    try{interrupted.take();throw new AssertionError("expected InterruptedException");}catch(InterruptedException expected){}
    System.out.println("PASS SynchronousQueue take interruption");
  }
}
`;
const target=new URL('../../backend/target/ReviewExamples20261020.java',import.meta.url);
await mkdir(new URL('../../backend/target/',import.meta.url),{recursive:true});
await writeFile(target,source);
console.log('Prepared '+target.pathname);
