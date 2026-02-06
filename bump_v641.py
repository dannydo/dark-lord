
import os

file_path = '/Users/dannydo/antigravity-workspaces/dark-lord/wings-ai-extension/background.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Refine Image Request Protocol with NEW MANDATORY SEQUENCE
old_protocol = """- **IMAGE REQUESTS (MANDATORY 2-STEP PROTOCOL)**: Khi khách hỏi "Cho chị xem hình", bạn PHẢI trả lời theo đúng cấu trúc sau:
          1. **SOCIAL IMPACT**: Mô tả cực cháy về Ý NGHĨA bộ mi đó sẽ khiến những người xung quanh (anh hàng xóm, đồng nghiệp, người yêu cũ...) phải "điêu đứng", "quay xe", "xiu up xiu down" thế nào. Phải làm khách cảm thấy mình sẽ là "Spotlight".
          2. **TIME REQUEST**: Kết thúc bằng việc xin khách 30 giây hoặc 1 phút để "Chuyên viên" gởi hình thật từ Gallery qua cho chị "mục sở thị" ạ! 
          - **MANDATORY EXAMPLE**: "Chị ơi, kiểu này lên mắt là anh hàng xóm chỉ có nước 'xoay 180 độ' vì chị quá cuốn hút thôi! Hehe. Đợi em 30s để em lục Gallery gởi hình bộ mi 'thần thánh' này qua chị xem cho chuẩn nha! 😉\\\"\\\"\\\"\""

new_protocol = """- **IMAGE REQUEST PROTOCOL (REVERSED SEQUENCE - MANDATORY)**: Khi khách hỏi "Cho chị xem hình", bạn PHẢI trả lời theo đúng thứ tự sau:
          1. **TIME REQUEST (FIRST)**: Xin khách vài giây (10-30s) để "đào hình" hoặc "lục Gallery" gởi qua cho chị.
          2. **SOCIAL IMPACT (SECOND)**: Tả ý nghĩa của bộ mi đó kết nối với việc sẽ làm cho những người xung quanh "điêu đứng" thế nào.
             - **IvyLight**: Khiến anh ấy "đứng ngồi không yên".
             - **HyperLight**: Làm đồng nghiệp "Gato" (ganh tị), thể hiện ngay "Quyền Lực Ngầm".
          - **MANDATORY EXAMPLE**: "Chị [Tên] ơi, cho em 10 giây để đào hình IvyLight và HyperLight cho mình nhé! 😉\\n\\nĐặc điểm của IvyLight là sự mỏng nhẹ, long lanh sẽ khiến anh ấy 'đứng ngồi không yên' luôn đó chị. Còn HyperLight thì đảm bảo làm đồng nghiệp của mình phải 'Gato' nhen, vì nó thể hiện rõ cái chất 'Quyền Lực Ngầm' của chị luôn nè! 😎\""""

content = content.replace(content.split('- **IMAGE REQUESTS (MANDATORY 2-STEP PROTOCOL)**:')[1].split('\"\"\"')[0], new_protocol.split('- **IMAGE REQUEST PROTOCOL (REVERSED SEQUENCE - MANDATORY)**:')[1])
# Correcting replacement logic to handle the large block
content = content.replace('- **IMAGE REQUESTS (MANDATORY 2-STEP PROTOCOL)**:', '- **IMAGE REQUEST PROTOCOL (REVERSED SEQUENCE - MANDATORY)**:')

# Direct replacement of the content inside the block might be tricky due to split, let's use a simpler marker
target_block_start = '- **IMAGE REQUEST PROTOCOL (REVERSED SEQUENCE - MANDATORY)**:'
# Find the end of this block which is the next bullet or end of section
# Actually, I'll just rewrite the whole background.js update script for precision

content = content.replace('const VERSION = "6.4.0";', 'const VERSION = "6.4.1";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Bumped version to V6.4.1")
