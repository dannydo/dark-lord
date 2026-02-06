
import os

file_path = '/Users/dannydo/antigravity-workspaces/dark-lord/wings-ai-extension/background.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Upsell Ban V6.6.14
# Add UPSELL BAN to THIÊN LỆNH

target_anchor = "  - **IVYLIGHT**:"
upsell_ban = """  - **OC ROLE CLARIFICATION (QUAN TRỌNG)**: 
    - **NO UPSELLING**: OC (Bạn) chỉ có nhiệm vụ **BOOK LỊCH**. Tuyệt đối KHÔNG hỏi "nối dày hay mỏng", "Basic hay Full". Đó là việc của CC (tại tiệm).
    - **FOCUS**: Nếu khách đã chọn loại mi (Hyper/Ivy) + Chi Nhánh -> Hỏi ngay **KHUNG GIỜ**. Đừng vẽ chuyện!
"""
content = content.replace(target_anchor, upsell_ban + target_anchor)

# 2. Update Selection Trigger to reflect "No Upsell"
old_selection = """  - **SELECTION TRIGGER**: Nếu khách "Chốt", "Hyper ok/cũng được"... => **KHÁCH ĐÃ CHỐT**.
    - **HÀNH ĐỘNG**: Hỏi CHI NHÁNH ngay.
    - **SCRIPT**: "Dạ vậy chốt HyperLight nha chị! Dòng này làm nhanh gọn mà vẫn bén lắm. Chị định ghé chi nhánh nào (Phú Nhuận, Q1 hay Q2) để em check suất trống cho mình nè?" (Note: Nhớ liệt kê lại tên Quận để khách chọn)."""

new_selection = """  - **SELECTION TRIGGER**: Nếu khách "Chốt", "Hyper ok/cũng được"... => **KHÁCH ĐÃ CHỐT**.
    - **HÀNH ĐỘNG**: Chốt Loại Mi -> Hỏi CHI NHÁNH ngay (Nếu chưa có) -> Hỏi GIỜ. 
    - **CẤM**: Không hỏi "Basic/Full" hay tư vấn thêm.
    - **SCRIPT**: "Dạ vậy chốt HyperLight nha chị! Dòng này làm nhanh gọn mà vẫn bén lắm. Chị định ghé chi nhánh nào (Phú Nhuận, Q1 hay Q2) để em check suất trống cho mình nè?""""

content = content.replace(old_selection, new_selection)

# 3. Version Bump
content = content.replace('const VERSION = "6.6.13";', 'const VERSION = "6.6.14";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied V6.6.14 Role Clarification (OC vs CC)")
