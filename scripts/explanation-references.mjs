export function referenceTitle(value) {
  const url=new URL(value),host=url.hostname,path=url.pathname;
  if(host==='www.rfc-editor.org'){
    const number=path.match(/rfc(\d+)/)?.[1];
    const title={9293:'TCP',1035:'DNS',9110:'HTTP 语义',9111:'HTTP 缓存',9113:'HTTP/2',9000:'QUIC',8446:'TLS 1.3',6265:'Cookie',6455:'WebSocket'}[number];
    return title?`RFC ${number} · ${title}`:'HTTP 规范';
  }
  if(host==='ocw.mit.edu')return 'MIT 6.006 算法课程';
  if(host==='netty.io')return 'Netty ByteBuf API';
  if(host.endsWith('.whatwg.org'))return host.startsWith('fetch.')?'WHATWG Fetch 标准':'WHATWG HTML 标准';
  if(host==='docs.oracle.com')return path.includes('BigDecimal')?'Java 17 BigDecimal API':path.includes('native-memory-tracking')?'Java 17 NMT 指南':path.includes('/gctuning/')?'Java 17 GC 指南':'Java 17 规范与 API';
  if(host==='docs.spring.io')return 'Spring Framework 6.2 参考';
  if(host==='debezium.io')return 'Debezium Outbox 路由';
  if(host==='docs.aws.amazon.com')return path.includes('strangler')?'AWS 渐进拆分模式':'AWS 事务 Outbox 模式';
  if(host==='learn.microsoft.com')return path.includes('/architecture/')?'Azure 架构设计参考':path.includes('chunk')?'Azure AI Search 文档切分':'Azure AI Search 权限过滤';
  if(host==='zookeeper.apache.org')return 'ZooKeeper 协调模式';
  if(host==='genai.owasp.org')return 'OWASP 提示注入风险';
  if(host==='dev.mysql.com')return 'MySQL 8.4 参考';
  if(host==='docs.stripe.com')return path.includes('idempotent')?'Stripe 幂等请求':'Stripe 事件处理';
  if(host==='docs.tigerbeetle.com')return path.includes('accounting')?'TigerBeetle 账务建模':'TigerBeetle 事务状态';
  if(host==='cheatsheetseries.owasp.org')return path.includes('Logging')?'OWASP 日志安全':'OWASP 交易授权';
  if(host==='sre.google')return 'Google SRE';
  if(host==='redis.io')return 'Redis 官方文档';
  if(host==='kafka.apache.org')return 'Kafka 4.1 设计';
  if(host==='openjdk.org')return 'OpenJDK 设计说明';
  if(host==='arxiv.org')return '原始研究论文';
  if(host==='docs.yjs.dev')return 'Yjs 协作编辑文档';
  if(host==='prometheus.io')return 'Prometheus 直方图与分位数';
  if(host==='martinfowler.com')return '事件溯源设计说明';
  if(host==='www.allthingsdistributed.com')return 'Dynamo 原始论文';
  if(host==='github.com'&&path.includes('facebookresearch/faiss'))return 'Faiss 度量说明';
  return host;
}
