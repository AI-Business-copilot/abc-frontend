import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { AuditForm } from './components/audit-form';
import { useAuditActions } from './hooks/use-audit-actions';
import { CatalogHeader } from '../../products/catalog-header';
import type { CreateAuditRequest } from '../../../types/audit';

export function AuditCreatePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const { loading, error, createAudit, clearError } = useAuditActions();

  const handleSubmit = async (data: CreateAuditRequest) => {
    try {
      const newAudit = await createAudit(data);
      navigate(`/inventory/audit/${newAudit.id}`, {
        state: { message: 'Đã tạo đợt kiểm kê. Hãy thêm dòng để bắt đầu đếm.', openAddItems: true },
      });
    } catch (err) {
      // Error is handled by the form
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="stock-audit" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/inventory/audit')}
        >
          ← Quay lại danh sách
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo đợt kiểm kê mới</h1>
          <p className="text-gray-600 mt-1">Bắt đầu một đợt kiểm kê tồn kho</p>
        </div>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-700">
          <button
            onClick={clearError}
            className="absolute right-4 top-4 text-red-600 hover:text-red-800"
          >
            ×
          </button>
          {error}
        </Alert>
      )}

      <AuditForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        submitLabel={loading ? 'Đang tạo...' : 'Tạo đợt kiểm kê'}
      />

      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
        <p className="font-semibold mb-2">Trước khi tạo đợt kiểm kê:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Tạo đợt kiểm kê trước, sau đó thêm dòng ở trang chi tiết</li>
          <li>
            Loại kiểm kê quyết định cách xử lý lô: Lô mới nghĩa là mỗi dòng là một lô mới do nhân viên
            nhập; Kiểm kê lại nghĩa là mỗi dòng dùng một lô có sẵn do bạn chọn khi thêm dòng
          </li>
          <li>Với kiểm kê lại, nhân viên giữ nguyên lô đó nhưng vẫn có thể sửa ngày của lô và nhập số đếm</li>
          <li>Lô chưa tồn tại sẽ được tạo khi bạn áp dụng đợt kiểm kê</li>
        </ul>
      </div>
      </main>
    </div>
  );
}
