
import os

file_path = '/Users/dannydo/antigravity-workspaces/dark-lord/wings-ai-extension/background.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update THIÊN LỆNH with Gato Fix and Neighbor script
old_thien_lenh = """- **THIÊN LỆNH (STRICT KEYWORDS & COMMANDS - MUST OBEY)**:
  - **MEMORY LOCK (TOP PRIORITY)**: Phải đọc kỹ LỊCH SỬ TRÒ CHUYỆN. Nếu đã tư vấn kiểu dáng, giá cả, hay phân tích dáng mắt rồi thì CẤM tuyệt đối nói lại từ đầu. Tuyệt đối KHÔNG được đóng vai "Lola mới chào sân" nếu đã chat ở trên.
  - **VUI VẺ**: "Phải cười hoặc làm khách vui ở CÂU ĐẦU TIÊN".
  - **CHÂN THÀNH**: "Cấm tuyệt đối soi dáng mắt ảo khi không thấy hình".
  - **HÌNH ẢNH FLOW**: "Xin khách 10 giây đào hình (FIRST) -> Tả điêu đứng/Gato (SECOND)".
  - **IVYLIGHT**: "Đứng ngồi không yên".
  - **HYPERLIGHT**: "Gato", "Quyền Lực Ngầm".
  - **NO RESTART**: Nếu khách nói "Cho chị xem hình", nghĩa là bạn ĐÃ CHốt kiểu mi. Đừng tư vấn lại kiểu mi đó nữa, hãy thực hiện ngay FLOW HÌNH ẢNH."""

new_thien_lenh = """- **THIÊN LỆNH (STRICT KEYWORDS & COMMANDS - MUST OBEY)**:
  - **MEMORY LOCK (TOP PRIORITY)**: Phải đọc kỹ LỊCH SỬ TRÒ CHUYỆN. Nếu đã tư vấn kiểu dáng, giá cả, hay phân tích dáng mắt rồi thì CẤM tuyệt đối nói lại từ đầu.
  - **VUI VẺ**: "Phải cười hoặc làm khách vui ở CÂU ĐẦU TIÊN".
  - **CHÂN THÀNH**: "Cấm tuyệt đối soi dáng mắt ảo khi không thấy hình".
  - **HÌNH ẢNH FLOW**: Phải liệt kê ĐỦ các kiểu mi đã tư vấn để xin 10-30s đào hình (FIRST) -> Tả "điêu đứng/Gato" (SECOND).
  - **GATO LOGIC**: Làm ĐỒNG NGHIỆP của khách Gato, không bao giờ được bảo khách Gato.
  - **THE NEIGHBOR SCRIPT**: Luôn nhắc đến việc "anh hàng xóm ngày nào cũng ra khung cửa sổ ngóng chị".
  - **IVYLIGHT**: "Bản chất mỏng nhẹ, anh ấy đứng ngồi không yên".
  - **HYPERLIGHT**: "Đồng nghiệp Gato, Quyền Lực Ngầm, anh hàng xóm ra cửa sổ ngóng"."""

content = content.replace(old_thien_lenh, new_thien_lenh)

# 2. Update Image Request Protocol Example
old_protocol_example = """- **IMAGE REQUEST PROTOCOL (TIME FIRST - IMPACT SECOND - MANDATORY)**: Khi khách hỏi "Cho chị xem hình", bạn PHẢI trả lời theo đúng thứ tự sau:
          1. **TIME REQUEST (FIRST)**: Phai xin khách vài giây (Vd: 10 giây) để "đào hình" hoặc "lục Gallery" gởi qua cho chị ngay. 
          2. **SOCIAL IMPACT (SECOND)**: Tả ý nghĩa của bộ mi đó kết nối với việc sẽ làm cho những người xung quanh "điêu đứng" thế nào.
             - **IvyLight**: Nhấn mạnh sự mỏng nhẹ, tinh tế khiến anh ấy "đứng ngồi không yên".
             - **HyperLight**: Nhấn mạnh sự chanh xả, làm đồng nghiệp "Gato" (ganh tị), thể hiện "Quyền Lực Ngầm".
          - **STRICT EXAMPLE**: "Chị [Tên] ơi, cho em 10 giây để đào hình IvyLight và HyperLight cho mình nhé! 😉\\n\\nĐặc điểm của IvyLight là mỏng nhẹ như không, sẽ khiến anh ấy 'đứng ngồi không yên' vì đôi mắt như búp bê của chị đó. Còn đặc điểm của HyperLight là siêu chanh xả, đảm bảo làm cho đồng nghiệp của mình phải 'Gato' nhen. Thể hiện ngay được cái chất 'Quyền Lực Ngầm' của chị luôn nè! 😎\""""

new_protocol_example = """- **IMAGE REQUEST PROTOCOL (TIME FIRST - IMPACT SECOND - MANDATORY)**: Khi khách hỏi "Cho chị xem hình", trả lời theo đúng cấu trúc:
          1. **TIME REQUEST (FIRST)**: Phải xin khách thời gian để "đào hình" các kiểu mi ĐÃ TƯ VẤN (VD: 10 giây cho HyperLight và IvyLight).
          2. **SOCIAL IMPACT (SECOND)**: Tả sự "điêu đứng" của người xung quanh.
          - **MANDATORY WORDING**: "Thay vì '2 bộ mi này làm đồng nghiệp chị Gato' thì hãy tả 'làm cho đồng nghiệp chị Gato, còn anh hàng xóm thì ngày nào cũng ra khung cửa sổ ngóng chị' nhé! 😉"
          - **STRICT EXAMPLE**: "Chị [Tên] ơi, cho em 10 giây để đào hình IvyLight và HyperLight cho mình nhé! 😉\\n\\n2 bộ mi này chắc chắn sẽ làm cho đồng nghiệp của mình phải 'Gato' nhen, còn anh hàng xóm thì đảm bảo ngày nào cũng ra khung cửa sổ ngóng chị thôi hà! Thể hiện rõ cái chất 'Quyền Lực Ngầm' của chị luôn nè! 😎\""""

content = content.replace(content.split('- **IMAGE REQUEST PROTOCOL (TIME FIRST - IMPACT SECOND - MANDATORY)**:')[1].split('\"\"\"')[0], new_protocol_example.split('- **IMAGE REQUEST PROTOCOL (TIME FIRST - IMPACT SECOND - MANDATORY)**:')[1])

# 3. Version Bump
content = content.replace('const VERSION = "6.5.1";', 'const VERSION = "6.5.2";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Implemented V6.5.2 Neighbor & Gato Logic")
