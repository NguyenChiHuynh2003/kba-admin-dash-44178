import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractsList } from "./ContractsList";
import { GuaranteesList } from "./GuaranteesList";

export function ContractsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Hợp đồng</h2>
        <p className="text-muted-foreground">Quản lý hợp đồng nhận thầu và các loại bảo lãnh</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Hợp đồng nhận thầu</TabsTrigger>
          <TabsTrigger value="appendix">Phụ lục hợp đồng</TabsTrigger>
          <TabsTrigger value="contract_guarantee">Bảo lãnh hợp đồng</TabsTrigger>
          <TabsTrigger value="advance_guarantee">Bảo lãnh tạm ứng</TabsTrigger>
          <TabsTrigger value="warranty_guarantee">Bảo lãnh bảo hành</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ContractsList />
        </TabsContent>

        <TabsContent value="appendix" className="mt-6">
          <ContractsList filterType="appendix" />
        </TabsContent>

        <TabsContent value="contract_guarantee" className="mt-6">
          <GuaranteesList guaranteeType="Bảo lãnh hợp đồng" />
        </TabsContent>

        <TabsContent value="advance_guarantee" className="mt-6">
          <GuaranteesList guaranteeType="Bảo lãnh tạm ứng" />
        </TabsContent>

        <TabsContent value="warranty_guarantee" className="mt-6">
          <GuaranteesList guaranteeType="Bảo lãnh bảo hành" />
        </TabsContent>
      </Tabs>
    </div>
  );
}