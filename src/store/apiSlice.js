import { createSelector } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: (headers) => {
            headers.set('x-custom-headers-global', Math.random());
            return headers;
        }
    }),
    refetchOnFocus: true,
    refetchOnReconnect: true,
    tagTypes: ['Services', 'Dogs'],
    endpoints: (builder) => ({
        getServices: builder.query({
            keepUnusedDataFor: 6000,
            query: () => ({
                url: '/services',
                headers: { 'x-custom-header': Math.random() }
            }),
        }),
        getService: builder.query({
            query: (id) => '/services/' + id,
        }),
        makeContact: builder.mutation({
            query: (body) => ({
                url: 'contact',
                method: 'POST',
                body,
            }),
        }),
        getDogs: builder.query({
            query: () => '/dogs',
            transformResponse: (dogs) => {
                const allDogs = {};
                for (const id in dogs) {
                    const dog = dogs[id];
                    allDogs[id] = {
                        ...dog,
                        size: getSize(dog.weight),
                        age: getAge(dog.dob),
                    };
                }
                return allDogs;
            },
            providesTags: 'Dogs',
        }),
        addDog: builder.mutation({
            query: (body) => ({
                url: '/dogs',
                method: 'POST',
                body
            }),
            invalidatesTags: 'Dogs',
        }),
        removeDog: builder.mutation({
            query: (id) => ({
                url: `/dogs/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: 'Dogs',
            onQueryStarted(id, { dispatch, queryFulfilled }) {
                const update = dispatch(api.util.updateQueryData('getDogs', undefined, (dogs) => {
                    delete dogs[id];
                }));
                queryFulfilled.catch(() => {
                    update.undo();
                });
            }
        })
    }),
});

export const {
    useAddDogMutation,
    useGetServicesQuery,
    useGetServiceQuery,
    useMakeContactMutation,
    useGetDogsQuery,
    useRemoveDogMutation,
} = api;

export const getServicesForLuckyDog = createSelector(
    api.endpoints.getServices.select(),
    api.endpoints.getDogs.select(),
    (state) => state.dogs.luckyDog,
    ({ data: services }, { data: myDogs }, luckyDog) => {
        // if you don't have a lucky dog, show all of the services
        const dog = myDogs?.[luckyDog];
        if (!dog) {
            return services;
        }

        // filter the services shown based on the currently chosen dog
        return services
            .filter(({ restrictions }) => {
                return restrictions.minAge ? dog.age >= restrictions.minAge : true;
            })
            .filter(({ restrictions }) => {
                return restrictions.breed ? restrictions.breed.includes(dog.breed) : true;
            })
            .filter(({ restrictions }) => {
                return restrictions.breed ? restrictions.size.includes(dog.size) : true;
            });
    }
)

// utilities

export function getSize(weight) {
    weight = parseInt(weight, 10);
    if (weight <= 10) return "teacup";
    if (weight <= 25) return "small";
    if (weight <= 50) return "medium";
    if (weight <= 80) return "large";
    if (weight <= 125) return "x-large";
    return "jumbo";
}

const YEAR = 3.156e10;
export function getAge(dob) {
    const date = +new Date(dob);
    return Math.floor((Date.now() - date) / YEAR);
}