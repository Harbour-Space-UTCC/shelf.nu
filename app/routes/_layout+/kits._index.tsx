import type { Prisma } from "@prisma/client";
import { KitStatus } from "@prisma/client";
import { json, redirect } from "@remix-run/node";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { StatusFilter } from "~/components/booking/status-filter";
import { ChevronRight } from "~/components/icons/library";
import { KitStatusBadge } from "~/components/kits/kit-status-badge";
import Header from "~/components/layout/header";
import { List } from "~/components/list";
import { ListContentWrapper } from "~/components/list/content-wrapper";
import { Filters } from "~/components/list/filters";
import { Button } from "~/components/shared/button";
import { Td, Th } from "~/components/table";
import type { KITS_INCLUDE_FIELDS } from "~/modules/asset/fields";
import { getPaginatedAndFilterableKits } from "~/modules/kit/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError } from "~/utils/error";
import { data, error } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.validator.server";
import { requirePermission } from "~/utils/roles.server";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.kit,
      action: PermissionAction.read,
    });

    const { kits, totalKits, perPage, page, totalPages } =
      await getPaginatedAndFilterableKits({
        request,
        organizationId,
      });

    if (totalPages !== 0 && page > totalPages) {
      return redirect("/kits");
    }

    const header = {
      title: "Kit",
    };

    const modelName = {
      singular: "kit",
      plural: "kits",
    };

    return json(
      data({
        header,
        items: kits,
        page,
        totalItems: totalKits,
        perPage,
        modelName,
        searchFieldLabel: "Search kits",
        searchFieldTooltip: {
          title: "Search your kits database",
          text: "Search kits based on name or description.",
        },
      })
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw json(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: appendToMetaTitle(data?.header.title) },
];

export default function KitsIndexPage() {
  const navigate = useNavigate();

  return (
    <>
      <Header hidePageDescription>
        <Button to="new" role="link" aria-label="new kit" icon="kit">
          New Kit
        </Button>
      </Header>

      <ListContentWrapper>
        <Filters
          slots={{
            "left-of-search": <StatusFilter statusItems={KitStatus} />,
          }}
        />

        <List
          ItemComponent={ListContent}
          hideFirstHeaderColumn
          navigate={(kitId) => navigate(kitId)}
          className=" overflow-x-visible md:overflow-x-auto"
          headerChildren={
            <>
              <Th className="hidden md:table-cell">Name</Th>
              <Th className="hidden md:table-cell">Description</Th>
              <Th className="hidden md:table-cell">Assets</Th>
              <Th className="hidden md:table-cell">Custodian</Th>
            </>
          }
        />
      </ListContentWrapper>
    </>
  );
}

function ListContent({
  item,
}: {
  item: Prisma.KitGetPayload<{
    include: typeof KITS_INCLUDE_FIELDS;
  }>;
}) {
  return (
    <>
      <Td className="whitespace-normal p-0 md:p-0">
        <div className="flex justify-between gap-3 p-4 md:justify-normal md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center">
              <div className="size-10 rounded bg-gray-200" />
            </div>
            <div className="min-w-[130px]">
              <span className="word-break mb-1 block font-medium">
                {item.name}
              </span>
              <div>
                <KitStatusBadge status={item.status} availableToBook={true} />
              </div>
            </div>
          </div>

          <button className="block md:hidden">
            <ChevronRight />
          </button>
        </div>
      </Td>

      <Td className="hidden md:table-cell">{item.description}</Td>

      <Td className="hidden md:table-cell">{item._count.assets}</Td>

      <Td className="hidden md:table-cell">
        {item.custody ? (
          <GrayBadge>
            <>
              {item.custody.custodian?.user ? (
                <img
                  src={
                    item.custody.custodian?.user?.profilePicture ||
                    "/static/images/default_pfp.jpg"
                  }
                  className="mr-1 size-4 rounded-full"
                  alt=""
                />
              ) : null}
              <span className="mt-px">{item.custody.custodian.name}</span>
            </>
          </GrayBadge>
        ) : null}
      </Td>
    </>
  );
}

const GrayBadge = ({
  children,
}: {
  children: string | JSX.Element | JSX.Element[];
}) => (
  <span className="inline-flex w-max items-center justify-center rounded-2xl bg-gray-100 px-2 py-[2px] text-center text-[12px] font-medium text-gray-700">
    {children}
  </span>
);
