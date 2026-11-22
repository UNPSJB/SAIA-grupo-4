import { Fragment } from "react";
import { Breadcrumb } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { construirMigas, type MigaItem } from "./breadcrumbsLogica";

interface BreadcrumbsProps {
  homeLabel?: string;
  homePath?: string;
}

export const Breadcrumbs = (_props: BreadcrumbsProps) => {
  const location = useLocation();
  const migas = construirMigas(location.pathname, location.state);

  if (migas.length === 0) {
    return null;
  }

  return renderBreadcrumb(migas);
};

function renderBreadcrumb(migas: MigaItem[]) {
  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {migas.map((miga, index) => {
          const esUltima = index === migas.length - 1;

          return (
            <Fragment key={`${miga.to}-${index}`}>
              <Breadcrumb.Item>
                {esUltima || !miga.esLink ? (
                  <Breadcrumb.CurrentLink
                    as="span"
                    fontSize="sm"
                    fontWeight={esUltima ? "medium" : "normal"}
                    color={esUltima ? "green.700" : "gray.600"}
                    _dark={{
                      color: esUltima ? "green.300" : "gray.400",
                    }}
                  >
                    {miga.nombre}
                  </Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link asChild>
                    <RouterLink
                      to={miga.to}
                      state={miga.state}
                      style={{
                        fontSize: "sm",
                        fontWeight: "normal",
                        color: "gray.600",
                        textDecoration: "none",
                      }}
                    >
                      {miga.nombre}
                    </RouterLink>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>
              {!esUltima && (
                <Breadcrumb.Separator
                  fontSize="sm"
                  color="gray.400"
                  mx={1}
                  _dark={{ color: "gray.500" }}
                >
                  /
                </Breadcrumb.Separator>
              )}
            </Fragment>
          );
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
