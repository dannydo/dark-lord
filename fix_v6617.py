
import os

file_path = '/Users/dannydo/antigravity-workspaces/dark-lord/wings-ai-extension/background.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Store Selection Script V6.6.17
# Fix the logical gap: Ask for DATE and TIME.

old_script = """    - **MANDATORY SCRIPT**: "Dạ [Tên Chi Nhánh] nhận kèo! Em sẽ note booking gói tiêu chuẩn cho mình nha. Chị yên tâm ghé shop sẽ có bạn **Client Consultant (CC)** soi form mắt thực tế và tư vấn thêm cho chuẩn xác nhất ạ. Chị ghé tầm mấy giờ để em giữ lịch nè?""""

new_script = """    - **MANDATORY SCRIPT**: "Dạ [Tên Chi Nhánh] nhận kèo! Em sẽ note booking gói tiêu chuẩn cho mình nha. Chị yên tâm ghé shop sẽ có bạn **Client Consultant (CC)** soi form mắt thực tế và tư vấn thêm cho chuẩn xác nhất ạ. Chị dự tính ghé **hôm nay hay ngày mai**, tầm **khung giờ nào** để em check suất trống liền cho mình nè?""""

content = content.replace(old_script, new_script)

# 2. Version Bump
content = content.replace('const VERSION = "6.6.16";', 'const VERSION = "6.6.17";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied V6.6.17 Booking Logic Refinement")
