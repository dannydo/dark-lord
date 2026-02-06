
import os

file_path = '/Users/dannydo/antigravity-workspaces/dark-lord/wings-ai-extension/background.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CC Value Logic V6.6.19
# We need to replace the single MANDATORY SCRIPT with a list of VARIATIONS.

# Find the old block (V6.6.17 version)
old_trigger_block = """    - **MANDATORY SCRIPT**: "Dạ [Tên Chi Nhánh] nhận kèo! Em sẽ note booking gói tiêu chuẩn cho mình nha. Chị yên tâm ghé shop sẽ có bạn **Client Consultant (CC)** soi form mắt thực tế và tư vấn thêm cho chuẩn xác nhất ạ. Chị dự tính ghé **hôm nay hay ngày mai**, tầm **khung giờ nào** để em check suất trống liền cho mình nè?""""

# New block with 3 Premium Variations
new_trigger_block = """    - **MANDATORY CLOSING VARIATIONS (CHOOSE ONE TO ELEVATE CC VALUE)**:
      1. SCRIPT A ("The Expert Tuner"): "Dạ [Tên Chi Nhánh] nhận kèo! Em note gói Tiêu Chuẩn trước nha. Ghé shop bạn CC (Client Consultant) sẽ check kỹ sức khỏe mi thật để 'tune' lại độ cong & độ dày cho chuẩn gu chị nhất ạ. Chị dự tính ghé **hôm nay hay ngày mai**, tầm **khung giờ nào** để em giữ lịch?"
      2. SCRIPT B ("The Aesthetic Hacker"): "Dạ [Tên Chi Nhánh] chốt đơn! Em giữ suất Tiêu Chuẩn cho mình. Tới nơi bạn CC chuyên nghiệp sẽ xem trực tiếp để tư vấn cách 'hack' dáng mắt sao cho bén & hài hòa nhất với gương mặt chị. Chị tính ghé **hôm nay hay mai**, tầm **khung giờ nào** ạ?"
      3. SCRIPT C ("The Real-Time Analyst"): "Dạ [Tên Chi Nhánh] đã nhận! Em book suất Tiêu Chuẩn nha. Chị cứ yên tâm, đến shop có bạn CC 'mát tay' kiểm tra form mắt thực tế rồi mới tư vấn mix sợi cho bền đẹp nhất. Chị ghé được **hôm nay hay mai**, khoảng **mấy giờ** để em xếp lịch?" """

# Execute Replacement
if old_trigger_block in content:
    content = content.replace(old_trigger_block, new_trigger_block)
else:
    print("WARNING: Exact match for old script failed. Trying simpler search.")
    # Fallback search if exact string fails due to whitespace
    short_search = '"Dạ [Tên Chi Nhánh] nhận kèo! Em sẽ note booking gói tiêu chuẩn cho mình nha.'
    if short_search in content:
         # We need to be careful to replace the whole line/block
         # Let's find the start index
         start_idx = content.find(short_search)
         # Find the end of the line/block (roughly looking for the end quote)
         end_idx = content.find('nè?"', start_idx) + 4
         if end_idx > start_idx:
             content = content[:start_idx-26] + new_trigger_block + content[end_idx:] # -26 to cover "- **MANDATORY SCRIPT**: "
         else:
             print("CRITICAL: Could not define end of block.")
    else:
        print("CRITICAL: Fallback search failed.")

# 2. Version Bump
content = content.replace('const VERSION = "6.6.18";', 'const VERSION = "6.6.19";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied V6.6.19 CC Value Elevation")
