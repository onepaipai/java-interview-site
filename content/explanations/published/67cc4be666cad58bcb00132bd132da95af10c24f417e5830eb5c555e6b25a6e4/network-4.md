<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9293 · TCP · 1](https://www.rfc-editor.org/rfc/rfc9293.html)

</details>

## 参考回答

1. TCP 提供有序字节流，不保留一次 write 对应一次 read 的边界；应用必须自行分帧。
2. 协议可用定长、转义分隔符或长度前缀；接收端维护累积缓冲，半帧保留，多帧循环解析。
3. 长度前缀先等完整头、校验长度上限，再等正文；长度单位应是编码后的字节数，不是字符数。
4. 同时限制帧长、缓冲和半帧等待时间；负长度、溢出与超限必须在分配内存前拒绝。
5. 调整 read 缓冲或关闭 Nagle 都不能解决协议边界；连接关闭时的截断帧也要明确处理。

## 案例

1. 场景（教学示例）：4 字节大端正文长度；两帧 ABC、Z，被分为半个头、剩余头加部分正文、剩余全部三次送入。

2. 处理：以下教学解码器限制正文最多 8 字节、缓冲 32 字节；完整帧才消费，不足时保留。

```java
class Decoder {
    final java.nio.ByteBuffer in = java.nio.ByteBuffer.allocate(32);
    java.util.List<String> feed(byte[] bytes) {
        if (bytes.length > in.remaining())
            throw new IllegalArgumentException("buffer limit");
        in.put(bytes).flip();
        var frames = new java.util.ArrayList<String>();
        while (in.remaining() >= 4) {
            in.mark();
            int length = in.getInt();
            if (length < 0 || length > 8)
                throw new IllegalArgumentException("frame limit");
            if (in.remaining() < length) { in.reset(); break; }
            byte[] body = new byte[length];
            in.get(body);
            frames.add(new String(body, java.nio.charset.StandardCharsets.UTF_8));
        }
        in.compact();
        return frames;
    }
}
var decoder = new Decoder();
System.out.println(decoder.feed(new byte[]{0, 0}));
System.out.println(decoder.feed(new byte[]{0, 3, 65}));
System.out.println(decoder.feed(new byte[]{66, 67, 0, 0, 0, 1, 90}));
```

3. 结果：依次输出 []、[]、[ABC, Z]；半帧不输出，最后一次同时解析两帧，正文没有丢失或串帧。

4. 验证：补测零长、负长、超过 8 字节、截断正文和半帧超时；协议错误应终止该连接，生产解码器另需处理受限扩容与大批输入。

## 总结点

1. TCP 保字节顺序，不保帧。
2. 半帧保留，多帧循环。
3. 先验长度，再读正文。
